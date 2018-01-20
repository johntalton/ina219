const rasbus = require('rasbus');
const Repler = require('./repler.js');
const ina219 = require('./src/ina219.js');

Repler.addCommand({
  name: 'init',
  completer: undefined,
  valid: (state) => true,
  callback: function(state) {
    return rasbus.i2c.init(1, 0x40).then(bus => {
      return ina219.sensor(bus).then(sensor => { state.sensor = sensor });
    });
  }
});

Repler.addCommand({
  name: 'config',
  valid: state => state.sensor !== undefined,
  callback: state => state.sensor.getConfig().then(config => config).then(console.log)
});

Repler.addCommand({
  name: 'calibration',
  valid: state => state.sensor !== undefined,
  callback: state => state.sensor.getCalibration().then(cal => cal).then(console.log)
});



Repler.addCommand({
  name: 'shunt',
  valid: state => state.sensor !== undefined,
  callback: state => state.sensor.getShuntVoltage_mV().then(mV => 'shunt voltage (mV) ' + mV).then(console.log)
});

Repler.addCommand({
  name: 'bus',
  valid: state => state.sensor !== undefined,
  callback: state => state.sensor.getBusVoltage_V().then(V => 'bus voltage (V) ' + V).then(console.log)
});

Repler.addCommand({
  name: 'power',
  valid: state => state.sensor !== undefined,
  callback: state => state.sensor.getPower_mW().then(mW => 'power (mW) ' + mW).then(console.log)
});

Repler.addCommand({
  name: 'current',
  valid: state => state.sensor !== undefined,
  callback: state => state.sensor.getCurrent_mA().then(mA => 'current (mA) ' + mA).then(console.log)
});

Repler.addCommand({
  name: 'measurment',
  valid: state => state.sensor !== undefined,
  callback: state => {
    return Promise.all([
      state.sensor.getShuntVoltage_mV(),
      state.sensor.getBusVoltage_V(),
      state.sensor.getPower_mW(),
      state.sensor.getCurrent_mA()
    ]).then(([shunt_mV, bus_V, power_mW, current_mA]) => {
	return 'shunt (mV) ' + shunt_mV + '\n' +
               'bus (V) ' + bus_V + '\n' +
               'power (mW) ' + power_mW + '\n' +
               'current (mA) ' + current_mA;
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
  callback: state => state.sensor.reset()
});

Repler.addCommand({
  name: 'disableadc',
  valid: state => state.sensor !== undefined,
  callback: state => state.sensor.disableADC()
});



Repler.go();
