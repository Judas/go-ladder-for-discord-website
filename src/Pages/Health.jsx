import { useState } from "react";

import TableElement from "../Components/Table/TableElement.jsx";
import RowGroupElement from "../Components/Table/RowGroupElement.jsx";
import RowElement from "../Components/Table/RowElement.jsx";
import ColHeaderElement from "../Components/Table/ColHeaderElement.jsx";
import CellElement from "../Components/Table/CellElement.jsx";
import Loader from "../Components/Loader.jsx";
import useApi from "../hooks/useApi.js";

import './Health.css';

const REFRESH_MS = 30000;

export default function Health() {
    const [autoRefresh, setAutoRefresh] = useState(true);

    // 503 is the *normal* answer of this route when a service is down, and it carries the body that says which one.
    // Without acceptErrorStatus the page would show a network error and hide the diagnosis.
    const { status, data, httpStatus, reload } = useApi('/api/health', {
        acceptErrorStatus: true,
        refreshMs: autoRefresh ? REFRESH_MS : 0,
    });

    if (status === 'pending') {
        return <div className={'FlexContainer'}><Loader/></div>;
    }

    if (status === 'error') {
        return (
            <section className={'Health Container'}>
                <h2 className={'PageTitle PageTitle--standalone'}>État des services</h2>
                <p className={'Error'}>Impossible de joindre l'API.</p>
            </section>
        );
    }

    const services = data.services ?? [];

    return (
        <section className={'Health Container'}>
            <h2 className={'PageTitle PageTitle--standalone'}>État des services</h2>

            <Verdict
                healthy={data.healthy}
                httpStatus={httpStatus}
                serviceCount={services.length}
                autoRefresh={autoRefresh}
                onRefresh={reload}
                onToggleAutoRefresh={() => setAutoRefresh(on => !on)} />

            {services.length === 0
                ? <p className={'Error'}>Aucun service enregistré : les modules du serveur n'ont pas démarré.</p>
                : <ServiceTable services={services} />}
        </section>
    );
}

function Verdict({healthy, httpStatus, serviceCount, autoRefresh, onRefresh, onToggleAutoRefresh}) {
    const plural = serviceCount > 1 ? 's' : '';

    return (
        <div className={`Health__Verdict ${healthy ? 'healthy' : 'unhealthy'}`}>
            <p className={'Health__VerdictLabel'}>
                {healthy ? 'Tous les services répondent' : 'Un service au moins est en défaut'}
            </p>
            <p className={'Health__VerdictDetail'}>
                HTTP {httpStatus} — {serviceCount} service{plural} surveillé{plural}
            </p>
            <div className={'Health__Controls'}>
                <button type="button" className={'Health__Button'} onClick={onRefresh}>Rafraîchir</button>
                <label className={'Health__Auto'}>
                    <input type="checkbox" checked={autoRefresh} onChange={onToggleAutoRefresh} />
                    <span>Toutes les {REFRESH_MS / 1000} s</span>
                </label>
            </div>
        </div>
    );
}

function ServiceTable({services}) {
    return (
        <TableElement className={'Health__Table'}>
            <RowGroupElement className={'Health__THead'}>
                <RowElement>
                    <ColHeaderElement className={'Health__State'}><span className={'ReaderOnly'}>État</span></ColHeaderElement>
                    <ColHeaderElement className={'Health__Name'}>Service</ColHeaderElement>
                    <ColHeaderElement className={'Health__Success'}>Dernier succès</ColHeaderElement>
                    <ColHeaderElement className={'Health__Interval'}>Intervalle</ColHeaderElement>
                    <ColHeaderElement className={'Health__Failures'}>Échecs</ColHeaderElement>
                </RowElement>
            </RowGroupElement>
            <RowGroupElement className={'Health__TBody'}>
                {services.map(service => <ServiceRow key={service.name} service={service} />)}
            </RowGroupElement>
        </TableElement>
    );
}

function ServiceRow({service}) {
    return (
        <RowElement className={'Health__Row'}>
            <CellElement colIndex={1} className={'Health__State'}>
                <span className={service.healthy ? 'valid' : 'invalid'} />
                {/* The dot is the only thing a healthy row says about its state, so it needs a name. An unhealthy
                    one already prints its reason next to the service name — saying it twice would have a screen
                    reader read it twice. */}
                {service.healthy && <span className={'ReaderOnly'}>{stateLabel(service)}</span>}
            </CellElement>
            <CellElement colIndex={2} className={'Health__Name'}>
                {service.name}
                {!service.healthy && <span className={'Health__Reason'}>{stateLabel(service)}</span>}
            </CellElement>
            <CellElement colIndex={3} className={'Health__Success'}>
                <span className={'Health__Label'}>Dernier succès</span>
                {formatAge(service.secondsSinceLastSuccess)}
                <span className={'Health__Threshold'}>seuil {formatDuration(service.staleAfterSeconds)}</span>
            </CellElement>
            <CellElement colIndex={4} className={'Health__Interval'}>
                <span className={'Health__Label'}>Intervalle</span>
                {formatDuration(service.intervalSeconds)}
            </CellElement>
            <CellElement colIndex={5} className={'Health__Failures'}>
                <span className={'Health__Label'}>Échecs</span>
                {service.consecutiveFailures}
                {service.lastFailure && <span className={'Health__Failure'} title={service.lastFailure}>{service.lastFailure}</span>}
            </CellElement>
        </RowElement>
    );
}

function stateLabel(service) {
    if (!service.running) { return 'arrêté'; }
    if (service.stale) { return 'silencieux'; }
    return 'en marche';
}

/**
 * `secondsSinceLastSuccess` is null while a service has yet to complete a tick — inside its initial delay, or
 * because every tick so far has failed. "jamais" is the honest reading; "0 s" would be the opposite of the truth.
 */
function formatAge(seconds) {
    return seconds == null ? 'jamais' : `il y a ${formatDuration(seconds)}`;
}

function formatDuration(seconds) {
    if (seconds == null) { return '—'; }
    if (seconds < 60) { return `${seconds} s`; }
    if (seconds < 3600) { return `${Math.round(seconds / 60)} min`; }
    return `${Math.round(seconds / 3600)} h`;
}
