import { createBrowserRouter } from 'react-router'
import { routeObjects } from './routeObjects.tsx'

/** The app's one browser router, built from the single route table. */
export const router = createBrowserRouter(routeObjects)
