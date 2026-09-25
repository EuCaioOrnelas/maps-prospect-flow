import { forwardRef, useImperativeHandle } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StripeCardForm } from "./StripeCardForm";

const optionHistory: Record<string, unknown[]> = { number: [], expiry: [], cvc: [] };

vi.mock("@stripe/react-stripe-js", () => ({
  useStripe: () => ({ createPaymentMethod: vi.fn() }),
  useElements: () => ({ getElement: vi.fn() }),
  CardNumberElement: forwardRef((_props: Record<string, unknown>, ref) => {
    optionHistory.number.push(_props.options);
    useImperativeHandle(ref, () => ({}));
    return <input aria-label="Número do cartão" />;
  }),
  CardExpiryElement: (props: Record<string, unknown>) => {
    optionHistory.expiry.push(props.options);
    return <input aria-label="Validade" />;
  },
  CardCvcElement: (props: Record<string, unknown>) => {
    optionHistory.cvc.push(props.options);
    return <input aria-label="CVV" />;
  },
}));

describe("StripeCardForm", () => {
  beforeEach(() => Object.values(optionHistory).forEach((history) => history.splice(0)));

  it("mantém as mesmas opções e o foco dos campos durante atualizações do pai", () => {
    const onCardHolderChange = vi.fn();
    const { rerender } = render(
      <StripeCardForm cardHolder="Cliente" onCardHolderChange={onCardHolderChange} disabled={false} />,
    );

    const cardNumber = screen.getByLabelText("Número do cartão");
    cardNumber.focus();
    const initialOptions = optionHistory.number.at(-1);

    rerender(
      <StripeCardForm cardHolder="Cliente atualizado" onCardHolderChange={onCardHolderChange} disabled />,
    );

    expect(screen.getByLabelText("Número do cartão")).toBe(cardNumber);
    expect(cardNumber).toHaveFocus();
    expect(optionHistory.number.at(-1)).toBe(initialOptions);
    expect(initialOptions).not.toHaveProperty("disabled");
  });

  it("mantém número, validade e CVV interativos após uma nova renderização", () => {
    const { rerender } = render(
      <StripeCardForm cardHolder="Cliente" onCardHolderChange={() => {}} />,
    );

    for (const label of ["Número do cartão", "Validade", "CVV"]) {
      const field = screen.getByLabelText(label);
      fireEvent.change(field, { target: { value: "123" } });
      expect(field).toHaveValue("123");
    }

    rerender(<StripeCardForm cardHolder="Outro nome" onCardHolderChange={() => {}} />);
    expect(screen.getByLabelText("Número do cartão")).toHaveValue("123");
  });
});
