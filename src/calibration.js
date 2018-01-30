const Units = require('./units.js');
const Chip = require('./chip.js');

/**
 *
 **/
class Calibration {
  // equation 1 from spec
  static maxPosibleCurrent_A(brng, pg, rshunt_ohm) {
    const vshuntMax = Calibration.pgToGainVoltage(pg);
    return vshuntMax.V / (rshunt_ohm * 1.0);
  }

  // equation 2/3 from spec
  static lsbMin_A(A) { return A / (Math.pow(2, 15) - 1); }
  static lsbMax_A(A) { return A / Math.pow(2, 12); }
  static lsbRange_A(A) {
    return [Calibration.lsbMin_A(A), Calibration.lsbMax_A(A)];
  }

  // reverse equ 2
  static maxAfromCurrentLSB_A(currentLSB_A) { return currentLSB_A * (Math.pow(2, 15) - 1); }

  // equation 4 from spec
  static fromCurrentLSB_A(currentLSB_A, rshunt_ohm) {
    const raw = Math.trunc(0.04096 / (currentLSB_A * rshunt_ohm));
    // if(raw & 0b1 === 0b1) { // log, na, optimize return, maybe
    return raw & ~0b1; // wipe the last bit as spec sais unwritable
  }

  // reverse equ 4
  static toCurrentLSB(calibration, rshunt_ohm) {
    return 0.04096 / calibration / rshunt_ohm;
  }

  // equation 5 from spec
  static powerLSB_mW(currentLSB_A) {
    return Units.AtomA(currentLSB_A) * 20.0;
  }






  // helper
  static pgToGainVoltage(pg) {
    const stepmV = 40; // 40 mV
    switch(pg) {
      case Chip.PG.GAIN_1: return { gain: 1, mV:     stepmV, V: Units.mVtoV(stepmV) };
      case Chip.PG.GAIN_2: return { gain: 2, mV: 2 * stepmV, V: Units.mVtoV(2 * stepmV) };
      case Chip.PG.GAIN_4: return { gain: 4, mV: 4 * stepmV, V: Units.mVtoV(4 * stepmV) };
      case Chip.PG.GAIN_8: return { gain: 8, mV: 8 * stepmV, V: Units.mVtoV(8 * stepmV) };
      default: throw Error('unknown gain');
    }
  }



  /*static infoFrom(currentLSB_A, brng, pg, rshunt_ohm) {
    return {
      maxV:
      rangeV: [],
      stepV:

      maxA:
      rangeA: [],
      stepA:
    };
  }*/
}

module.exports = Calibration;
