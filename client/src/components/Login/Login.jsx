import { Car01Icon } from "@hugeicons/core-free-icons";
import { GoogleLogin } from "@react-oauth/google";
import { useState } from "react";
import { useDispatch } from "react-redux";
import { Button } from "@/components/ui/button";
import { useGoogleLoginMutation, useLoginMutation } from "../../app/api.js";
import { setToken } from "../../features/auth/authSlice.js";
import { Field } from "../Field/Field.jsx";
import { Icon } from "../Icon/Icon.jsx";

const demoEmail = "admin@autowydatki.pl";
const demoPassword = "autowydatki";
const googleEnabled = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

export const Login = () => {
  const dispatch = useDispatch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [login, { isLoading, error }] = useLoginMutation();
  const [googleLogin, googleState] = useGoogleLoginMutation();
  const [googleFailed, setGoogleFailed] = useState(false);
  const errorMessage = error?.data?.message || (error ? "Nie udało się zalogować." : "");
  const googleErrorMessage =
    googleState.error?.data?.message ||
    (googleState.error || googleFailed ? "Nie udało się zalogować przez Google." : "");

  const fillDemoLogin = () => {
    setEmail(demoEmail);
    setPassword(demoPassword);
  };

  const onGoogleSuccess = async ({ credential }) => {
    setGoogleFailed(false);

    try {
      const result = await googleLogin(credential).unwrap();
      dispatch(setToken(result.token));
    } catch {
      // The error message is rendered from the mutation result.
    }
  };

  const onSubmit = async (event) => {
    event.preventDefault();

    try {
      const result = await login({ email, password }).unwrap();
      dispatch(setToken(result.token));
    } catch {
      // The error message is rendered from the mutation result.
    }
  };

  return (
    <main className="mx-auto grid min-h-svh max-w-md content-center gap-6 px-4 pt-[calc(2.5rem+env(safe-area-inset-top))] pb-[calc(2.5rem+env(safe-area-inset-bottom))]">
      <div className="grid justify-items-center gap-3 text-center">
        <span className="flex size-16 items-center justify-center rounded-2xl bg-primary/20 text-primary shadow-lg shadow-primary/20">
          <Icon icon={Car01Icon} size={34} />
        </span>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">Autowydatki</h1>
        <p className="text-sm text-muted-foreground">Paliwo, serwis i wszystkie koszty auta w jednym miejscu.</p>
      </div>
      <section className="grid gap-6 rounded-3xl border bg-card/80 p-5 backdrop-blur">
        {googleEnabled ? (
          <div className="grid gap-4">
            {/* The GIS iframe is light-scheme; inside our dark-scheme page the browser paints it an opaque white. */}
            <div className="flex justify-center [color-scheme:light]">
              <GoogleLogin
                onSuccess={onGoogleSuccess}
                onError={() => setGoogleFailed(true)}
                text="signin_with"
                shape="pill"
                theme="filled_black"
                locale="pl"
              />
            </div>
            {googleErrorMessage ? (
              <p role="alert" className="text-center text-sm text-destructive">
                {googleErrorMessage}
              </p>
            ) : null}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              albo email i hasło
              <span className="h-px flex-1 bg-border" />
            </div>
          </div>
        ) : null}
        <form className="grid gap-4" onSubmit={onSubmit}>
          <Field
            id="email"
            label="Email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <Field
            id="password"
            label="Hasło"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          {errorMessage ? (
            <p role="alert" className="text-sm text-destructive">
              {errorMessage}
            </p>
          ) : null}
          <Button type="submit" size="lg" disabled={isLoading}>
            {isLoading ? "Logowanie..." : "Zaloguj się"}
          </Button>
        </form>
      </section>
      <aside className="grid gap-3 rounded-3xl border border-primary/30 bg-primary/10 p-5">
        <div className="grid gap-1">
          <h2 className="font-heading font-semibold">Dane dla rekrutera</h2>
          <p className="text-sm text-muted-foreground">Możesz zalogować się tym kontem.</p>
        </div>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <div className="min-w-0">
            <dt className="text-muted-foreground">Email</dt>
            <dd className="truncate font-medium">{demoEmail}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Hasło</dt>
            <dd className="font-medium">{demoPassword}</dd>
          </div>
        </dl>
        <Button type="button" variant="outline" onClick={fillDemoLogin}>
          Wypełnij dane
        </Button>
      </aside>
    </main>
  );
};
