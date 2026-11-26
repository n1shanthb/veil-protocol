pragma circom 2.0.0;

// Multiplier proves knowledge of private factors a, b such that a * b == c.
// Public signals: [c] (1 public output).
template Multiplier() {
    signal input a;
    signal input b;
    signal output c;

    c <== a * b;
}

component main = Multiplier();
