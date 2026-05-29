import { useEffect, useRef } from "react";
import Image from "next/image";

export function LoginGate({
  errorMessage,
  isLoading = false,
  onLogin,
}: {
  errorMessage?: string;
  isLoading?: boolean;
  onLogin: (credentials: { email: string; password: string }) => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    formRef.current?.setAttribute("data-ready", "true");
  }, []);

  return (
    <main className="login-screen">
      <section className="login-panel" aria-labelledby="login-title">
        <div className="brand login-brand">
          <Image
            className="brand-logo"
            src="/thermoeye-logo.png"
            alt="Thermoeye"
            width={266}
            height={150}
            priority
          />
        </div>

        <div>
          <p className="eyebrow">Secure pilot access</p>
          <h1 id="login-title">Sign in to review screening cases</h1>
          <p className="login-copy">
            Demo access uses a mock clinical account. No real patient data is stored or transmitted in this prototype.
          </p>
        </div>

        <form
          ref={formRef}
          className="login-form"
          data-ready="false"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            onLogin({
              email: String(formData.get("email") || ""),
              password: String(formData.get("password") || ""),
            });
          }}
        >
          <label>
            <span>Email</span>
            <input name="email" type="email" defaultValue="doctor@thermoeye.demo" aria-label="Email" />
          </label>
          <label>
            <span>Password</span>
            <input name="password" type="password" defaultValue="pilot-access" aria-label="Password" />
          </label>
          {errorMessage ? (
            <p className="form-error" role="alert">
              {errorMessage}
            </p>
          ) : null}
          <button className="primary-button wide" type="submit" disabled={isLoading}>
            {isLoading ? "Signing in..." : "Enter clinical console"}
          </button>
        </form>

        <div className="login-disclaimer">
          <strong>Access policy</strong>
          <span>Role-based UI, audit logging, and hospital tenancy are represented as MVP workflow controls.</span>
        </div>
      </section>
    </main>
  );
}
