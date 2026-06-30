import { renderToString } from "react-dom/server";
import Marketing from "./pages/Marketing";

// wouter's <Router>/<Switch>/<Route> emit no DOM, so the markup produced by
// <Marketing /> here is identical to <App /> on the client at path "/".
// Rendering the page directly avoids needing a browser location on the server.
export function render(): string {
  return renderToString(<Marketing />);
}
