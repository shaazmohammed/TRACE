import { AppShell } from './components/layout/AppShell';
import { useHashRoute } from './hooks/useHashRoute';
import { EventsPage } from './pages/EventsPage';
import { IncidentInvestigationPage } from './pages/IncidentInvestigationPage';
import { IncidentsPage } from './pages/IncidentsPage';
import { OverviewPage } from './pages/OverviewPage';

export function App() {
  const route = useHashRoute();

  return (
    <AppShell route={route}>
      {route.name === 'overview' && <OverviewPage />}
      {route.name === 'events' && <EventsPage />}
      {route.name === 'incidents' && <IncidentsPage />}
      {route.name === 'incident' && <IncidentInvestigationPage key={route.id} incidentId={route.id} />}
    </AppShell>
  );
}
