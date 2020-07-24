# INA219

A more feature rich version of the ina219 javascript package.  It allows for controlling the power state and mode (triggered vs continuous etc)

[![npm Version](https://img.shields.io/npm/v/@johntalton/ina219.svg)](https://www.npmjs.com/package/@johntalton/ina219)
![GitHub package.json version](https://img.shields.io/github/package-json/v/johntalton/ina219)
![CI](https://github.com/johntalton/ina219/workflows/CI/badge.svg?branch=master&event=push)
![GitHub](https://img.shields.io/github/license/johntalton/ina219)
[![Downloads Per Month](https://img.shields.io/npm/dm/@johntalton/ina219.svg)](https://www.npmjs.com/package/@johntalton/ina219)
![GitHub last commit](https://img.shields.io/github/last-commit/johntalton/ina219)
[![Package Quality](https://npm.packagequality.com/shield/%40johntalton%2Fina219.svg)](https://packagequality.com/#?package=@johntalton/ina219)

[Spec from Adafruit](https://cdn-shop.adafruit.com/datasheets/ina219.pdf)
or
[from Ti](http://www.ti.com/lit/ds/symlink/ina219.pdf)

## Install

standard npm install

`npm install --save @johntalton/ina219`

## Timing

it is up to you to respect call timing of the chip. (todo add misc method to aid in calculation)

## Resets

any events that cause unexpected reset of the calibration register should be validate on the caller side.


## Power-down and Disabled Profiles

The defualt profile (32V /8 12bit 12bit continuous both) is reset when calling the shorthand **powerdown()** and **disableADC()** per spec, with the exception of using the 1sample version of the eum over the 12bit (usefull in diagnostics).

