import { useEffect, useState } from "react";
import zxcvbn from "zxcvbn";
import "./PasswordStrengthMeter.css";

export function PasswordStrengthMeter({ passwordScore }: {
    passwordScore: number
}) {
    const createPasswordLabel = (score: number) => {
        switch (score) {
            case 0:
                return 'Weak';
            case 1:
                return 'Weak';
            case 2:
                return 'Weak';
            case 3:
                return 'Good';
            case 4:
                return 'Strong';
            default:
                return 'Weak';
        }
    }

    return (
        <div className="password-strength-meter">
            <progress
                className={`password-strength-meter-progress strength-${createPasswordLabel(passwordScore)}`}
                value={passwordScore}
                max="4"
            />
            <br />
            <label
                className="password-strength-meter-label"
            >
                {createPasswordLabel(passwordScore)}
            </label>
        </div>
    );
}
