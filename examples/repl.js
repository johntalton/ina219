"use strict";

const rasbus = require('rasbus');
const Repler = require('./repler.js');
const ina219lib = require('../src/ina219.js');
const ina219 = ina219lib.ina219;
const Misc = require('./repl-misc.js');
const Calibration = ina219lib.calibration;
const Units = ina219lib.units;

Repler.addPrompt((state) => {
  if(state.sensor !== undefined) {
    if(state.currentLSB_A !== undefined) {
      return 'ina219> ';
    } else {
      return 'ina219(*)> '
    }
  }
  return '(uninitialized)> ';
});

Repler.addCommand({
  name: 'gcr',
  valid: () => true,
  callback: (state) => {
    return rasbus.i2c.init(1, 0).then(bus => bus.writeSpecial(0x06));
  }
});

Repler.addCommand({
  name: 'init',
  completer: undefined,
  valid: (state) => state.sensor === undefined,
  callback: function(state) {
    const parts = state.line.trim().split(' ').slice(1);



    return rasbus.i2c.init(1, 0x40).then(bus => {
      return ina219.sensor(bus).then(sensor => { state.sensor = sensor });
    });
  }
});

Repler.addCommand({
  name: 'config',
  valid: state => state.sensor !== undefined,
  callback: state => state.sensor.getConfig().then(Misc.configString).then(console.log)
});

Repler.addCommand({
  name: 'calibration',
  valid: state => state.sensor !== undefined,
  callback: state => {
    return state.sensor.getCalibration().then(calibration => {
      if(state.currentLSB_A === undefined) {
        console.log('\tsetting current lsb from calibrtion');
        const est_currentlsb = Calibration.toCurrentLSB(calibration.raw, state.rshunt_ohms);
        state.currentLSB_A = est_currentlsb;
      } else {
        const est_cali = Calibration.fromCurrentLSB_A(state.currentLSB_A, state.rshunt_ohms);
        if(est_cali !== calibration.raw) {
          console.log(' * cached calibration missmatch', est_cali, calibration.raw);
        }
      }

      console.log('calibration: ' + calibration.raw);
    })
  }
});

/**
Repler.addCommand({
  name: 'shunt',
  valid: state => state.sensor !== undefined,
  callback: state => state.sensor.getShuntVoltage().then(shunt => 'shunt voltage (mV) ' + shunt.mV).then(console.log)
});

Repler.addCommand({
  name: 'bus',
  valid: state => state.sensor !== undefined,
  callback: state => state.sensor.getBusVoltage().then(bus => 'bus ' + bus.V).then(console.log)
});

Repler.addCommand({
  name: 'power',
  valid: state => state.sensor !== undefined,
  callback: state => state.sensor.getPower().then(power => 'power (mW) ' + power.mW).then(console.log)
});

Repler.addCommand({
  name: 'current',
  valid: state => state.sensor !== undefined,
  callback: state => state.sensor.getCurrent().then(current => 'current (mA) ' + current.mA).then(console.log)
});
**/

Repler.addCommand({
  name: 'measurment',
  valid: state => state.sensor !== undefined,
  callback: state => {
    return Promise.all([
      //state.sensor.getShuntVoltage(),
      //state.sensor.getBusVoltage(),
      state.sensor.getLoadVoltage(),
      state.sensor.getCurrent(state.currentLSB_A),
      state.sensor.getPower(Calibration.powerLSB_mW(state.currentLSB_A))
    ]).then(([load, current, power]) => {
        // bus.ready     all expected calc above bus
        // bus.overflow  invalid current and power potentialy (not bus overflow?)

        const normal = '\u001b[0m';
        const red = '\u001b[31m';

	return 'shunt:      ' + load.shunt.mV + ' mV' + '\n' +
               'bus:        ' + load.bus.V + ' V' + '\n' +
               'load:       ' + load.V + ' V' + '\n' +
               '  ready:    ' + (load.bus.ready ? 'true' : red + 'false' + normal) + '\n' +
               '  overflow: ' + (load.bus.overflow ? red + 'true' + normal : 'false') + '\n' +
               'current:    ' + (isNaN(current.mA) ? '*' : (current.mA + ' mA' +  ' (' + (Units.AtomA(state.currentLSB_A))  + ' mA/Bit)')) + '\n' +
               'power       ' + (isNaN(power.mW) ? '*' : (power.mW + ' mW' + ' (' + Calibration.powerLSB_mW(state.currentLSB_A) + ' mW/bit)'));
    }).then(console.log);
  }
});

Repler.addCommand({
  name: 'powerdown',
  valid: state => state.sensor !== undefined,
  callback: state => state.sensor.powerdown()
});

Repler.addCommand({
  name: 'reset',
  valid: state => state.sensor !== undefined,
  callback: state => { state.currentLSB_A = undefined; return state.sensor.reset(); }
});

Repler.addCommand({
  name: 'disable',
  valid: state => state.sensor !== undefined,
  callback: state => state.sensor.disableADC()
});

Repler.addCommand({
  name: 'trigger',
  valid: state => state.sensor !== undefined,
  completer: line => {
    const parts = line.trim().split(' ').slice(1);
    const validparts = parts.map((part, idx) => Misc.comp(part, Misc.trigger_config, idx));

    return [''];
  },
  callback: function(state) {
    const parts = state.line.trim().split(' ').slice(1);
    if(parts.length !== Misc.trigger_config.length) { throw new Error('invalid params length'); }
    const params = parts.map((part, idx) => Misc.call(part, Misc.trigger_config, idx));

    const [brng, pg, ] = params;

    state.currentLSB_A = Calibration.lsbMin_A(Calibration.maxPossibleCurrent_A(brng, pg, state.rshunt_ohms));
    const calibration = Calibration.fromCurrentLSB_A(state.currentLSB_A, state.rshunt_ohms);

    return state.sensor.trigger(calibration, ...params);
  }
});

Repler.addCommand({
  name: 'continuous',
  valid: state => state.sensor !== undefined,

  callback: function(state) {
    const parts = state.line.trim().split(' ').slice(1);
    if(parts.length !== Misc.trigger_config.length) { throw new Error('invalid params length'); }
    const params = parts.map((part, idx) => Misc.call(part, Misc.trigger_config, idx));

    const [brng, pg, ] = params;

    state.currentLSB_A = Calibration.lsbMin_A(Calibration.maxPossibleCurrent_A(brng, pg, state.rshunt_ohms));
    const calibration = Calibration.fromCurrentLSB_A(state.currentLSB_A, state.rshunt_ohms);

    return state.sensor.continuous(calibration, ...params);
  }
});

Repler.addCommand({
  name: 'bus',
  valid: state => state.sensor !== undefined,
  callback: function(state) {
    const parts = state.line.trim().split(' ').slice(1);
    const brng = Misc.stringToBRNG(parts[0]);

    return state.sensor.getConfig().then(cfg => {
      state.currentLSB_A = Calibration.lsbMin_A(Calibration.maxPossibleCurrent_A(brng, cfg.pg, state.rshunt_ohms));
      const calibration = Calibration.fromCurrentLSB_A(state.currentLSB_A, state.rshunt_ohms);
      return state.sensor.setCalibrationConfig(calibration, brng, cfg.pg, cfg.sadc, cfg.badc, cfg.mode);
    });
  }
});

Repler.addCommand({
  name: 'gain',
  valid: state => state.sensor !== undefined,
  callback: function(state) {
    const parts = state.line.trim().split(' ').slice(1);
    const pg = Misc.stringToPG(parts[0]);

    return state.sensor.getConfig().then(cfg => {
      state.currentLSB_A = Calibration.lsbMin_A(Calibration.maxPossibleCurrent_A(cfg.brng, pg, state.rshunt_ohms));
      const calibration = Calibration.fromCurrentLSB_A(state.currentLSB_A, state.rshunt_ohms);
      console.log(' gain set values:', state.currentLSB_A, calibration, pg);
      return state.sensor.setCalibrationConfig(calibration, cfg.brng, pg, cfg.sadc, cfg.badc, cfg.mode);
    });
  }
});

Repler.addCommand({
  name: 'adc',
  valid: state => state.sensor !== undefined,
  completer: foo => console.log(foo),
  callback: (state) => {
    const parts = state.line.trim().split(' ').slice(1);
    const which = parts[0];
    const adc = Misc.stringToADC(parts[1]);

    return state.sensor.getConfig().then(cfg => {
      const sadc = 'shunt'.startsWith(which) ? adc : cfg.sadc;
      const badc = 'bus'.startsWith(which) ? adc : cfg.badc;

      return state.sensor.setConfig(cfg.brng, cfg.pg, sadc, badc, cfg.mode);
    });
  }
});

Repler.go({
  rshunt_ohms: ina219lib.DEFAULT_RSHUNT_OHMS
});
