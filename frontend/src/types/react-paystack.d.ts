declare module 'react-paystack' {
    export interface PaystackProps {
        email: string;
        amount: number;
        publicKey: string;
        text?: string;
        onSuccess?: (reference: any) => void;
        onClose?: () => void;
        reference?: string;
        metadata?: Record<string, any>;
        currency?: string;
        channels?: string[];
        label?: string;
        plan?: string;
        quantity?: number;
        subaccount?: string;
        transaction_charge?: number;
        bearer?: string;
    }

    export function usePaystackPayment(config: {
        publicKey: string;
        reference?: string;
        email: string;
        amount: number;
        currency?: string;
        metadata?: Record<string, any>;
        channels?: string[];
    }): (onSuccess?: (reference: any) => void, onClose?: () => void) => void;

    export const PaystackButton: React.FC<PaystackProps>;
    export const PaystackConsumer: React.FC<{
        children: (arg: { initializePayment: Function }) => React.ReactNode;
    } & PaystackProps>;
}
