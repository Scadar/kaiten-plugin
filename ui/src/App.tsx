import {
  createRouter,
  createHashHistory,
  RouterProvider,
} from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';

// Use hash-based history so routing works under file:// protocol (JCEF)
const hashHistory = createHashHistory();

// Create the router instance
const router = createRouter({
  routeTree,
  history: hashHistory,
  defaultPreload: 'intent',
});

// Register the router for type-safe routing
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return <RouterProvider router={router} />;
}
