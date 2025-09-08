# INA219

A more feature rich version of the ina219 javascript package.  It allows for controlling the power state and mode (triggered vs continuous etc)

[![npm Version](https://img.shields.io/npm/v/@johntalton/ina219.svg)](https://www.npmjs.com/package/@johntalton/ina219)
![GitHub package.json version](https://img.shields.io/github/package-json/v/johntalton/ina219)
[![CI](https://github.com/johntalton/ina219/actions/workflows/CI.yml/badge.svg)](https://github.com/johntalton/ina219/actions/workflows/CI.yml)


[Spec from Adafruit](https://cdn-shop.adafruit.com/datasheets/ina219.pdf)
or
[from Ti](http://www.ti.com/lit/ds/symlink/ina219.pdf)


## Timing

It is up to you to respect call timing of the chip. (todo add misc method to aid in calculation)

## Resets

Any events that cause unexpected reset of the calibration register should be validate on the caller side.


## Power-down and Disabled Profiles

The default profile (32V /8 12bit 12bit continuous both) is reset when calling the shorthand **powerdown()** and **disableADC()** per spec, with the exception of using the 1sample version of the eum over the 12bit (useful in diagnostics).

