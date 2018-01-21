# INA219

A more feature rich version of the ina219 javascript package.  It allows for controlling the power state and mode (triggered vs continuous etc)


[Texas Instruments INA 219 spec](http://www.ti.com/lit/ds/symlink/ina219.pdf)


## Timing

it is up to you to respect call timing of the chip. (todo add misc method to aid in calculation)

## Resets

any events that cause unexpected reset of the calibration register should be validate on the caller side.


## Power-down and Disabled Profiles

The defualt profile (32V /8 12bit 12bit continuous both) is reset when calling the shorthand **powerdown()** and **disableADC()** per spec, with the exception of using the 1sample version of the eum over the 12bit (usefull in diagnostics).

