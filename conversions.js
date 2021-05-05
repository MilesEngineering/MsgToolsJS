// classes to perform integer/float conversions.
// Based on python code contributed to https://github.com/MilesEngineering/MsgTools
// written by Kenny Donahue.

class ResistanceConversion {
    static Convert(adc, v_ref, v_full, r1, r2, bit_depth) {
        let v_adc = adc * v_full / (2 ** bit_depth);
        var r;
        if (r2 == 0 && r1 != 0) {
            r = r1 * ((v_ref / v_adc) - 1.0);
        } else if (r1 == 0 && r2 != 0) {
            r = r2 * (v_adc / v_ref)/(1.0 - (v_adc/v_ref));
        } else {
            r = (r1 * r2) / ((((v_ref / v_adc) - 1.0) * r1) - r2);
        }
        return r;
    }

    static Invert(r, v_ref, v_full, r1, r2, bit_depth) {
        var v_adc;
        if(r2 == 0 && r1 != 0) {
            v_adc = v_ref / ((r / r1) + 1.0);
        } else if (r2 != 0 && r1 == 0) {
            v_adc = v_ref / ((r2 / r) + 1.0);
        } else {
            v_adc = v_ref / (((r1 * r2) + (r2 * r))/(r1 * r) + 1.0);
        }
        return Math.round(v_adc * (2 ** bit_depth) / v_full);
    }
}

class SteinhartHartConversion {
    static Convert(raw, a, b, c, d, r0, v_ref, v_full, r1, r2, bit_depth) {
        let r = ResistanceConversion.Convert(raw, v_ref, v_full, r1, r2, bit_depth);
        let x = Math.log(r / r0);
        let temp_k = 1.0 / (a + b * x + c * (x ** 2) + d * (x ** 3));
        let temp_c = temp_k - 273.15;
        return temp_c;
    }

    static Invert(temp_c, a, b, c, d, r0, v_ref, v_full, r1, r2, bit_depth) {
        let temp_k = temp_c + 273.15;
        const { allRoots } = FloPoly;
        const roots = allRoots([d, c, b, a - (1.0 / temp_k)]);
        return ResistanceConversion.Invert(r0 * Math.exp(roots[-1]),
                                           v_ref, v_full, r1, r2, bit_depth);
    }
}

class CallendarVanDusenConversion {
    static Convert(raw, a, b, c, r0, v_ref, v_full, r1, r2, bit_depth) {
        let r = ResistanceConversion.Convert(raw, v_ref, v_full, r1, r2, bit_depth);
        if (r > r0) {
            return (-a + Math.sqrt(a**2 - 4 * b * (1.0 - (r / r0)))) / (2 * b);
        }
        var t = ((r / r0) - 1.0) / (a + (100.0 * b));
        for (i in range(3)) { // up to 3 iterations
            var tn = t - ((1 + a * t + b * (t ** 2) + c * (t ** 3) * (t - 100) - (res / r0)) /
                      (a + 2 * b * t - 300 * c * (t**2) + 4 * c * (t**3)));
            if (abs(tn - t) < 3.0) { // arbitrary threshold to determine convergence
                return tn;
            }
            t = tn;
        }
        return t;
    }

    static Invert(temp_c, a, b, c, r0, v_ref, v_full, r1, r2, bit_depth) {
        var r;
        if (temp_c > 0) {
            r = r0 * (1 + a * temp_c + b * (temp_c ** 2));
        } else {
            r = r0 * (1 + a * temp_c + b * (temp_c ** 2) + c * (temp_c ** 3) * (temp_c - 100));
        }
        return ResistanceConversion.Invert(r, v_ref, v_full, r1, r2, bit_depth);
    }
}