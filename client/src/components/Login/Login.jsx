import { GoogleLogin } from "@react-oauth/google";
import { useState } from "react";
import { useDispatch } from "react-redux";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGoogleLoginMutation, useLoginMutation } from "../../app/api.js";
import { setToken } from "../../features/auth/authSlice.js";

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
    <div className="min-h-svh bg-muted/40">
      <main className="mx-auto flex min-h-svh max-w-md flex-col px-4 pt-16 pb-56">
        <Card>
          <CardHeader>
            <h1 className="text-2xl font-semibold leading-none">Autowydatki</h1>
            <CardDescription>Zaloguj się, aby zobaczyć koszty auta.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            {googleEnabled ? (
              <div className="grid gap-3">
                <div className="flex justify-center">
                  <GoogleLogin
                    onSuccess={onGoogleSuccess}
                    onError={() => setGoogleFailed(true)}
                    text="signin_with"
                    shape="pill"
                    locale="pl"
                  />
                </div>
                {googleErrorMessage ? (
                  <p role="alert" className="text-center text-sm text-destructive">
                    {googleErrorMessage}
                  </p>
                ) : null}
                <p className="text-center text-xs text-muted-foreground">albo email i hasło</p>
              </div>
            ) : null}
            <form className="grid gap-4" onSubmit={onSubmit}>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Hasło</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </div>
              {errorMessage ? (
                <p role="alert" className="text-sm text-destructive">
                  {errorMessage}
                </p>
              ) : null}
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Logowanie..." : "Zaloguj się"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
      <aside className="fixed right-4 bottom-4 z-10 w-72 max-w-[calc(100%-2rem)]">
        <Card>
          <CardHeader>
            <CardTitle>Dane dla rekrutera</CardTitle>
            <CardDescription>Możesz zalogować się tym kontem.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-2 text-sm">
              <div>
                <dt className="text-muted-foreground">Email</dt>
                <dd className="font-medium">{demoEmail}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Hasło</dt>
                <dd className="font-medium">{demoPassword}</dd>
              </div>
            </dl>
            <Button type="button" variant="outline" className="mt-4 w-full" onClick={fillDemoLogin}>
              Wypełnij dane
            </Button>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
};
