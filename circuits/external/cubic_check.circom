pragma circom 2.0.0;

// External third-party circuit example (not hardcoded in Veil):
// Proves knowledge of private x such that x^3 + x + 5 == out.
template CubicCheck() {
    signal input x;
    signal output out;

    signal x2;
    signal x3;
    x2 <== x * x;
    x3 <== x2 * x;
    out <== x3 + x + 5;
}

component main = CubicCheck();
