import { createRouter, RouterProvider } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';

// Create the router instance
const router = createRouter({
  routeTree,
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
