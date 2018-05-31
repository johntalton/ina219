const Units = require('./units.js');
const Chip = require('./chip.js');

/**
 *
 **/
class Calibration {
  // equation 1 from spec
  static maxPossibleCurrent_A(brng, pg, rshuntOhm) {
    const vshuntMax = Calibration.pgToGainVoltage(pg);
    return vshuntMax.V / (rshuntOhm * 1.0);
  }

  // equation 2/3 from spec
  static lsbMin_A(A) { return A / (Math.pow(2, 15) - 1); }
  static lsbMax_A(A) { return A / Math.pow(2, 12); }
  static lsbRange_A(A) {
    return { min: Calibration.lsbMin_A(A), max: Calibration.lsbMax_A(A) };
  }

  // equation 6 - reverse equation 2
  static maxAFromCurrentLSB_A(currentLSB_A) { return currentLSB_A * (Math.pow(2, 15) - 1); }

  // equation 4 from spec
  static fromCurrentLSB_A(currentLSB_A, rshunt_ohm) {
    const raw = Math.trunc(0.04096 / (currentLSB_A * rshunt_ohm));
    // if(raw & 0b1 === 0b1) { // log, na, optimize return, maybe
    return raw & ~0b1; // wipe last bit / per spec // todo correct ~ ?
  }

  // reverse equation 4
  static toCurrentLSB(calibration, rshuntOhm) {
    return 0.04096 / calibration / rshuntOhm;
  }

  // equation 5 from spec
  static powerLSB_mW(currentLSB_A) {
    return Units.AtomA(currentLSB_A) * 20.0;
  }

  // helper
  static pgToGainVoltage(pg) {
    const stepmV = 40; // 40 mV
    switch(pg) {
      case Chip.PG.GAIN_1: return { gain: 1, mV: 1 * stepmV, V: Units.mVtoV(stepmV) };
      case Chip.PG.GAIN_2: return { gain: 2, mV: 2 * stepmV, V: Units.mVtoV(2 * stepmV) };
      case Chip.PG.GAIN_4: return { gain: 4, mV: 4 * stepmV, V: Units.mVtoV(4 * stepmV) };
      case Chip.PG.GAIN_8: return { gain: 8, mV: 8 * stepmV, V: Units.mVtoV(8 * stepmV) };
      default: throw Error('unknown gain');
    }
  }

  // helper
  static brngToVoltage(brng) {
    switch(brng) {
      case Chip.BRNG.BUS_32: return 32;
      case Chip.BRNG.BUS_16: return 16;
      default: throw Error('unknown brng');
    }
  }

  static infoFrom(expected_A, brng, pg, rshunt_ohm) {
    const cfg_device_max_A = Calibration.maxPossibleCurrent_A(brng, pg, rshunt_ohm);
    const fullrange = Calibration.lsbRange_A(cfg_device_max_A);

    const clipped_A = Math.min(expected_A, cfg_device_max_A);
    const range = Calibration.lsbRange_A(clipped_A);

    const currentLSBGuess_A = range.min;

    const maxA = Calibration.maxAFromCurrentLSB_A(currentLSBGuess_A);

    return {
      device: { A: cfg_device_max_A }
      // todo
    };
  }
}

module.exports = Calibration;

