/**
 *
 **/
class Units {
  static mVtoV(mV){
    return mV * 0.001;
  }

  static uVtomV(uV) {
    return uV * 0.001; // uV / 1000.0;
  }

  static AtomA(A) {
    return A * 1000.0;
  }
}

module.exports = Units;
