import './SeasonBanner.css';

/**
 * Where the calendar stands, from the `period` and `season` every house and league response carries.
 *
 * The server is the only thing that knows when a season runs — it ships both fields with the data precisely so that
 * the site never computes a date. Nothing here does arithmetic on the clock.
 *
 * In `VACATION` the season named is the one that has just **ended**: a break in August 2026 reports "2025-2026".
 */
export default function SeasonBanner({period, season}) {
    const vacation = period === 'VACATION';

    return (
        <p className={`SeasonBanner ${vacation ? 'vacation' : 'season'}`}>
            {vacation ? (
                <>
                    <span className={'SeasonBanner__Label'}>Intersaison</span>
                    La saison {season} est terminée. Les points reprennent le 1<sup>er</sup> septembre.
                </>
            ) : (
                <>
                    <span className={'SeasonBanner__Label'}>Saison {season}</span>
                    Les parties comptent jusqu'au 31 mai.
                </>
            )}
        </p>
    );
}
