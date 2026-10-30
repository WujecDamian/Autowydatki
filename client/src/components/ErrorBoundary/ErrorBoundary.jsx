import { Component } from "react";
import { Button } from "@/components/ui/button";

// Shown instead of a blank page when a component throws while rendering.
export const CrashMessage = ({ onRetry }) => (
  <div role="alert" className="mx-auto grid max-w-md gap-4 p-8 text-center">
    <h1 className="text-xl font-semibold">Coś poszło nie tak</h1>
    <p className="text-muted-foreground">
      Aplikacja napotkała nieoczekiwany błąd. Spróbuj odświeżyć stronę.
    </p>
    <div className="flex justify-center gap-2">
      {onRetry ? (
        <Button variant="outline" onClick={onRetry}>
          Spróbuj ponownie
        </Button>
      ) : null}
      <Button onClick={() => window.location.reload()}>Odśwież stronę</Button>
    </div>
  </div>
);

// React only catches render errors in class components. Anything thrown outside rendering
// (event handlers, requests) is handled where it happens, so this is the last safety net.
export class ErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    // One place to forward to an error tracker such as Sentry later.
    console.error(error, info.componentStack);
  }

  render() {
    if (this.state.failed) {
      return <CrashMessage onRetry={() => this.setState({ failed: false })} />;
    }

    return this.props.children;
  }
}

// Used as the router's errorElement for errors thrown inside a route.
export const RouteError = () => <CrashMessage />;
