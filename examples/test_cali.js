



class Range {
  static from(value, step) {
    return new Range(value, step);
  }
  constructor(value, step) {
    this.value = value;
    this.step = step === undefined ? 0 : step;
  }

  in(value) {
    if(value === this.value){ return true; }
    if(this.step === 0){ return false; }

    const min = this.value - this.step;
    const max = this.value + this.step;
    if(value < min) { return false; }
    if(value > max) { return false; }
    return true;
  }
}

function example_1() {
  const rshunt = 0.5;
  // choose
  const maxexpected_i = 0.6;
  const current_lsb = 0.00002; // 20 * Math.pow(10, -6)

  example('#1', Chip.BRNG.BUS_32, Chip.PG.GAIN_8, rshunt, maxexpected_i, current_lsb, {
    maxpossible_i: Range.from(0.64),
    cal: 4096,
    power_lsb: .4, // 0.0004 W
    max_current: Range.from(0.65534),
    overflow_current: true,
    max_shuntvoltage: Range.from(.32),
    overflow_vshunt: true,
    max_power: Range.from(20.48)
  });
}

function example_2() {
  const rshunt = 5;
  // choose
  const maxexpected_i = 0.06;
  const current_lsb = 0.0000019;

  example('#2', Chip.BRNG.BUS_32, Chip.PG.GAIN_8, rshunt, maxexpected_i, current_lsb, {
    maxpossible_i: Range.from(0.064),
    cal: 4310, // 4311 masked
    power_lsb: 0.038,
    max_current: Range.from(0.06226, 0.00001),
    overflow_current: false,
    max_shuntvoltage: Range.from(0.3113, 0.0001),
    overflow_vshunt: false,
    max_power: Range.from(1.992, 0.001)
  });
}

function example_3() {
  const rshunt = 0.002;
  // choose
  const maxexpected_i = 15;
  const current_lsb = 0.001;

  example('#3', Chip.BRNG.BUS_16, Chip.PG.GAIN_1, rshunt, maxexpected_i, current_lsb, {
    maxpossible_i: Range.from(20),
    cal: 20480,
    power_lsb: 20,
    max_current: Range.from(32.767), // ?
    overflow_current: true,
    max_shuntvoltage: Range.from(.04), // ?
    overflow_vshunt: true,
    max_power: Range.from(320) // ?
  });
}

function example_32V_2A() {
  const rshunt = 0.1;
  // choose
  const maxexpected_i = 2;
  const current_lsb = 0.0001;

  example('32V 2A', Chip.BRNG.BUS_32, Chip.PG.GAIN_8, rshunt, maxexpected_i, current_lsb, {
    maxpossible_i: Range.from(3.2, 0.01),
    cal: 4096,
    power_lsb: 2, // 0.002 W
    max_current: Range.from(3.2767),
    overflow_current: true,
    max_shuntvoltage: Range.from(0.32),
    overflow_vshunt: true,
    max_power: Range.from(102.4, 0.01)
  });
}

function example_32V_1A() {
  const rshunt = 0.1;
  // choose
  const maxexpected_i = 1;
  const current_lsb = 0.0000400;

  example('32V 1A', Chip.BRNG.BUS_32, Chip.PG.GAIN_8, rshunt, maxexpected_i, current_lsb, {
    maxpossible_i: Range.from(3.2, 0.01),
    cal: 10240,
    power_lsb: 0.8,
    max_current: Range.from(1.31068),
    overflow_current: false,
    max_shuntvoltage: Range.from(0.131068, 0.0000001),
    overflow_vshunt: false,
    max_power: Range.from(41.94176)
  });
}

function example_16V_500mA() {
  const rshunt = 0.1;
  // choose
  const maxexpected_i = 0.5;
  const current_lsb = 0.0000250;

  example('16V 500mA', Chip.BRNG.BUS_16, Chip.PG.GAIN_2, rshunt, maxexpected_i, current_lsb, {
    maxpossible_i: Range.from(0.8, 0.01),
    cal: 16384,
    power_lsb: 0.5,
    max_current: Range.from(0.819175),
    overflow_current: true,
    max_shuntvoltage: Range.from(0.08),
    overflow_vshunt: true,
    max_power: Range.from(12.8, 0.01)
  });
}

function example_16V_400mA() {
  const rshunt = 0.1;
  // choose
  const maxexpected_i = 0.4;
  const current_lsb = 0.00005;

  example('16V 400mA', Chip.BRNG.BUS_16, Chip.PG.GAIN_1, rshunt, maxexpected_i, current_lsb, {
    maxpossible_i: Range.from(0.4, 0.01),
    cal: 8192,
    power_lsb: 1,
    max_current: Range.from(1.63835),
    overflow_current: true,
    max_shuntvoltage: Range.from(0.04),
    overflow_vshunt: true,
    max_power: Range.from(6.4, 0.01)
  });
}

function example_16V_200mA() {
  const rshunt = 0.1;
  // choose
  const maxexpected_i = 0.2;
  const current_lsb = 0.000010;

  example('16V 200mA', Chip.BRNG.BUS_16, Chip.PG.GAIN_1, rshunt, maxexpected_i, current_lsb, {
    maxpossible_i: Range.from(0.4, 0.01),
    cal: 40960,
    power_lsb: 0.2,
    max_current: Range.from(0.32767),
    overflow_current: false,
    max_shuntvoltage: Range.from(0.032767, 0.0000001),
    overflow_vshunt: false,
    max_power: Range.from(5.24, 0.01)
  });
}

function example(name, brng, pg, rshunt, maxexpected_i, current_lsb, expected)
{
  console.log(' --- running example: ' + name);

  const vshunt_max = Calibration.pgToGainVoltage(pg).V;
  const vbus_max = Calibration.brngToVoltage(brng);

  const maxpossible_i = Calibration.maxPossibleCurrent_A(brng, pg, rshunt);
  if(!expected.maxpossible_i.in(maxpossible_i)) { console.log('invalid  eq 1 (max)', maxpossible_i); return; }

  const lsbrange = Calibration.lsbRange_A(maxexpected_i);
  // console.log('lsbrange', lsbrange);
  if(current_lsb < lsbrange.min || current_lsb > lsbrange.max) { console.log('current NOT in max range!'); }

  const cal = Calibration.fromCurrentLSB_A(current_lsb, rshunt);
  if(cal !== expected.cal) { console.log('invalid eq 4 (calibration)', cal); return; }

  const power_lsb = Calibration.powerLSB_mW(current_lsb);
  if(power_lsb !== expected.power_lsb) { console.log('invalid eq 5 (power)', power_lsb); return; }

  const max_current = Calibration.maxAFromCurrentLSB_A(current_lsb);
  if(!expected.max_current.in(max_current)) { console.log('invalid eq 6 (current)', max_current); return; }

  const overflow_current = (max_current > maxpossible_i);
  if(overflow_current !== expected.overflow_current) { console.log('current overflow unexpected'); return; }
  const max_current_before_overflow = overflow_current ? maxpossible_i : max_current;

  const max_shuntvoltage = max_current_before_overflow * rshunt;
  if(!expected.max_shuntvoltage.in(max_shuntvoltage)) { console.log('invalid maxshuntvoltate', max_shuntvoltage); return; }

  const overflow_vshunt = (max_shuntvoltage >= vshunt_max);
  if(overflow_vshunt !== expected.overflow_vshunt) { console.log('vshunt overflow unexpected'); return; }
  const max_shuntvoltage_before_overflow = overflow_vshunt ? vshunt_max : max_shuntvoltage;

  const max_power = max_current_before_overflow * vbus_max;
  if(!expected.max_power.in(max_power)) { console.log('invalid maxpower', max_power); return; }

  console.log('OK');
  console.log();
}

if(!module.parent) {
  example_1();
  example_2();
  example_3();

  example_32V_2A();
  example_32V_1A();
  example_16V_500mA();
  example_16V_400mA();
  example_16V_200mA();
}

module.exports = Calibration;

