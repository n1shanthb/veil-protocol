pragma circom 2.0.0;

// SumOfSquares proves knowledge of private x, y such that x^2 + y^2 == target.
// Public signals: [ok, target] (2 public signals).
template SumOfSquares() {
    signal input x;
    signal input y;
    signal input target;
    signal output ok;

    signal x2;
    signal y2;

    x2 <== x * x;
    y2 <== y * y;
    target === x2 + y2;
    ok <== 1;
}

component main {public [target]} = SumOfSquares();
