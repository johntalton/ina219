const rasbus = require('rasbus');
const Repler = require('./repler.js');
const ina219lib = require('./src/ina219.js');
const ina219 = ina219lib.ina219;
const Misc = require('./repl-misc.js');
const Calibration = ina219lib.calibration;

Repler.addCommand({
  name: 'init',
  completer: undefined,
  valid: (state) => state.sensor === undefined,
  callback: function(state) {
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
    return state.sensor.getCalibration().then(cal => cal).then(console.log)
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
  callback: state => state.sensor.getBusVoltage().then(bus => 'bus ' + bus).then(console.log)
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
	return 'shunt:      ' + load.shunt.mV + ' mV' + '\n' +
               'bus:        ' + load.bus.V + ' V' + '\n' +
               'load:       ' + load.V + ' V' + '\n' +
               '  ready:    ' + (load.bus.ready ? 'true' : 'false') + '\n' +
               '  overflow: ' + (load.bus.overflow ? 'true' : 'false') + '\n' +
               'current:    ' + current.mA + ' mA' +  ' (' + (state.currentLSB_A * 1000.0)  + ' mA/Bit)' + '\n' +
               'power       ' + power.mW + ' mW' + ' (' + Calibration.powerLSB_mW(state.currentLSB_A) + ' mW/bit)';
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

    state.currentLSB_A = Calibration.lsbFromExact(Calibration.absoluteMax_A_alt(12, 8, 0.1));
    const calibration = Calibration.fromCurrentLSB_A(state.currentLSB_A, 0.1);

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

    state.currentLSB_A = 0.0000400; //Calibration.lsbFromExact(Calibration.absoluteMax_A_alt(12, 8, 0.1));
    const calibration = Calibration.fromCurrentLSB_A(state.currentLSB_A, 0.1);

    return state.sensor.continuous(calibration, ...params);
  }
});



Repler.go();
