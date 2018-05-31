module.exports = {

  RSHUNT_OHMS: 0.1, // default adafruit resister
  DEFAULT_I2C_ADDRESS: 0x40, // default i2c address
  DEFAULT_I2C_ADDRESSES: [0x40, 0x41, 0x44, 0x45], // default adafruit set

  SPEC_MAX_V: 26,

  REGISTERS: {
    CONFIG:      0x00,
    SHUNT:       0x01,
    BUS:         0x02,
    POWER:       0x03,
    CURRENT:     0x04,
    CALIBRATION: 0x05
  },

  MASKS: {
    CFG_RESET: 0x8000,
    CFG_BRNG:  0x2000,
    CFG_PG:    0x1800,
    CFG_BADC:  0x0780, // only place its bus then shunt everywhere else is shunt then bus
    CFG_SADC:  0x0078,
    CFG_MODE:  0x0007,

    BUS_OVF:  0x0001,
    BUS_CNVR: 0x0002
  },

  OFFSETS: {
    RESET: 15,
    BRNG:  13,
    PG:    11,
    BADC:   7,
    SADC:   3,
    MODE:   0
  },

  BRNG: {
    BUS_16: 0b0, // 16 V
    BUS_32: 0b1  // 32 V (default)
  },

  PG: {
    GAIN_1: 0b00, // +/- 40 mV
    GAIN_2: 0b01, // +/- 80 mV
    GAIN_4: 0b10, // +/- 160 mV
    GAIN_8: 0b11  // +/- 320 mV (default)
  },

  ADC: {
    ADC_9_BIT:       0b0000, // 84 us
    ADC_10_BIT:      0b0001, // 148 us
    ADC_11_BIT:      0b0010, // 276 us
    ADC_12_BIT:      0b0011, // 532 us (default)
    ADC_1_SAMPLE:    0b1000, // 532 us (12bit, or 1 sample)
    ADC_1_SAMPLES:   0b1000, // ^^ alias for plural - i know :)
    ADC_2_SAMPLES:   0b1001, // 1.06 us
    ADC_4_SAMPLES:   0b1010, // 2.13 ms
    ADC_8_SAMPLES:   0b1011, // 4.26 ms
    ADC_16_SAMPLES:  0b1100, // 8.51 ms
    ADC_32_SAMPLES:  0b1101, // 17.02 ms
    ADC_64_SAMPLES:  0b1110, // 34.05 ms
    ADC_128_SAMPLES: 0b1111  // 68.10 ms
  },

  MODES: {
    POWERDOWN:            0b000,
    DISABLEDADC:          0b100,

    TRIGGERED_SHUNT:      0b001,
    TRIGGERED_BUS:        0b010,
    TRIGGERED_SHUNT_BUS:  0b011,

    CONTINUOUS_SHUNT:     0b101,
    CONTINUOUS_BUS:       0b110,
    CONTINUOUS_SHUNT_BUS: 0b111
  }
};
