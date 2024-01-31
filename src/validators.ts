namespace Validators {
    export function validateEmail(email: any): boolean {
        if (!email || !email.length || email.length > 50) return false;
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }
    export function validateString(input: any, maxLength: number): boolean {
        if (!input || !input.length || input.length > maxLength) return false;
        return true;
    }
    export function validateDate(input: Array<any>): boolean {
        if (!input || !input.length || input.length > 4) return false;
        return true;
    }
    export function validateToken(input: string): boolean {
        if (!input || !input.length || input.length < 4 || input.length > 100) return false;
        return true;
    }
}
export default Validators;