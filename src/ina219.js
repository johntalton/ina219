import { Units } from './units.js'
import {
	REGISTERS,
	MASKS,
	OFFSETS,
	BRNG,
	PG,
	ADC,
	MODES
} from './chip.js'

/** @import { I2CAddressedBus } from '@johntalton/and-other-delights' */

export class INA219 {
	/** @type {I2CAddressedBus} */
	#bus

	constructor(bus) {
		this.#bus = bus
	}

	async reset() {
		const cfg = (1 << OFFSETS.RESET) & MASKS.CFG_RESET
		return this.#bus.writeI2cBlock(REGISTERS.CONFIG, INA219.#split16(cfg))
	}

	// not safe
	async setCalibrationConfig(calibration, brng, pg, sadc, badc, mode) {
		await this.setCalibration(calibration)
		await this.setConfig(brng, pg, sadc, badc, mode)
	}

	async setConfig(brng, pg, sadc, badc, mode) {
		// todo validate
		const cfg = 0
			| ((brng << OFFSETS.BRNG) & MASKS.CFG_BRNG)
			| ((pg << OFFSETS.PG) & MASKS.CFG_PG)
			| ((sadc << OFFSETS.SADC) & MASKS.CFG_SADC)
			| ((badc << OFFSETS.BADC) & MASKS.CFG_BADC)
			| (mode & MASKS.CFG_MODE)

		return this.#bus.writeI2cBlock(REGISTERS.CONFIG, INA219.#split16(cfg))
	}

	// shorthand
	async trigger(calibration, brng, pg, sadc, badc, shunt, bus) {
		const mode = INA219.#makeMode(true, shunt, bus)
		return this.setCalibrationConfig(calibration, brng, pg, sadc, badc, mode)
	}

	// shorthand
	async continuous(calibration, brng, pg, sadc, badc, shunt, bus) {
		const mode = INA219.#makeMode(false, shunt, bus)
		return this.setCalibrationConfig(calibration, brng, pg, sadc, badc, mode)
	}

	// shorthand
	async powerdown() {
		return this.setConfig(BRNG.BUS_32, PG.GAIN_8, ADC.ADC_1_SAMPLE, ADC.ADC_1_SAMPLE, MODES.POWERDOWN)
	}

	// shorthand
	async disableADC() {
		return this.setConfig(BRNG.BUS_32, PG.GAIN_8, ADC.ADC_1_SAMPLE, ADC.ADC_1_SAMPLE, MODES.DISABLEDADC)
	}

	async getConfig() {
		const buffer = await this.#bus.readI2cBlock(REGISTERS.CONFIG, 2)
		const cfg = INA219.#getUInt16BE(buffer)

		const brng = (cfg & MASKS.CFG_BRNG) >> OFFSETS.BRNG
		const pg = (cfg & MASKS.CFG_PG) >> OFFSETS.PG
		const sadc = (cfg & MASKS.CFG_SADC) >> OFFSETS.SADC
		const badc = (cfg & MASKS.CFG_BADC) >> OFFSETS.BADC
		const mode = (cfg & MASKS.CFG_MODE)

		return {
			brng: brng,
			pg: pg,
			sadc: sadc,
			badc: badc,
			mode: mode
		}
	}

	async setCalibration(calibration) {
		if ((calibration & 0b1) === 0b1) { throw Error('calibration LSB set (they say its not possible') }
		return this.#bus.writeI2cBlock(REGISTERS.CALIBRATION, INA219.#split16(calibration))
	}

	async getCalibration() {
		const buffer = await this.#bus.readI2cBlock(REGISTERS.CALIBRATION, 2)
		const raw = INA219.#getUInt16BE(buffer)
		return {
			raw: raw
		}
	}

	async getShuntVoltage() {
		const buffer = await this.#bus.readI2cBlock(REGISTERS.SHUNT, 2)
		const raw = INA219.#getInt16BE(buffer)
		const shuntLSB_uV = 10 // 10 uV
		return {
			raw: raw,
			uV: raw * shuntLSB_uV,
			mV: Units.uVtomV(raw * shuntLSB_uV)
		}
	}

	async getBusVoltage() {
		const buffer = await this.#bus.readI2cBlock(REGISTERS.BUS, 2)
		const raw = INA219.#getUInt16BE(buffer)
		const ovf = (raw & MASKS.BUS_OVF) === MASKS.BUS_OVF
		const cnvr = (raw & MASKS.BUS_CNVR) === MASKS.BUS_CNVR
		const value = (raw >> 3) // shift for status register
		const busLSB_mV = 4 // 4 mV

		return {
			ready: cnvr,
			overflow: ovf,
			raw: value,
			mV: value * busLSB_mV,
			V: Units.mVtoV(value * busLSB_mV)
		}
	}

	async getCurrent(currentLSB_A) {
		// todo assert calibration
		const buffer = await this.#bus.readI2cBlock(REGISTERS.CURRENT, 2)
		const raw = INA219.#getInt16BE(buffer)
		return {
			raw: raw,
			A: raw * currentLSB_A,
			mA: raw * Units.AtomA(currentLSB_A)
		}
	}

	async getPower(powerLSB_mW) {
		// todo assert calibration
		const buffer = await this.#bus.readI2cBlock(REGISTERS.POWER, 2)
		const raw = INA219.#getInt16BE(buffer)
		return {
			raw: raw,
			mW: raw * powerLSB_mW
		}
	}

	static #makeMode(triggered, shunt, bus) {
		if (shunt && bus) { return triggered ? MODES.TRIGGERED_SHUNT_BUS : MODES.CONTINUOUS_SHUNT_BUS }
		if (shunt && !bus) { return triggered ? MODES.TRIGGERED_SHUNT : MODES.CONTINUOUS_SHUNT }
		if (!shunt && bus) { return triggered ? MODES.TRIGGERED_BUS : MODES.CONTINUOUS_BUS }

		// (!shunt && !bus)
		throw Error('shunt, bus or both must be enabled for triggered mode')
	}

	/**
	 * @param {number} value16bit
	 * @returns ArrayBufferLike|ArrayBufferView
	 */
	static #split16(value16bit) {
		return Uint8Array.from([
			(value16bit >> 8) & 0xFF,
			value16bit & 0xFF
		])
	}

	static #getInt16BE(buffer) {
		const dv = ArrayBuffer.isView(buffer) ?
			new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength) :
			new DataView(buffer)

		return dv.getInt16(0, false)
	}

	static #getUInt16BE(buffer) {
		const dv = ArrayBuffer.isView(buffer) ?
			new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength) :
			new DataView(buffer)

		return dv.getUint16(0, false)
	}
}

