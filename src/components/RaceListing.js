// @flow

import * as React from 'react';
import moment from 'moment';
import { useTranslation } from 'react-i18next';
import { shallowEqual, useDispatch, useSelector } from 'react-redux';
import { updateSetting } from '../actions/settings';
import SortArrow from './SortArrow';

import allRaces from '../lib/races';
import filterRaces from '../lib/filterRaces';
import sortRaces from '../lib/sortRaces';

import availableColumns from '../data/availableColumns';

import styles from '../styles/main.scss';
import raceListingStyles from './styles/raceListing.scss';

const settingsSelector = (state) => state.settings;
const dateSelector = (state) => state.app.date;

export default function RaceListing(): React.Node {
  const { t } = useTranslation();
  const settings = useSelector(settingsSelector, shallowEqual);
  const date = useSelector(dateSelector, shallowEqual);
  const {
    filters, favouriteSeries, favouriteCars, favouriteTracks,
    sort, ownedCars, ownedTracks, columns,
  } = settings;
  const dispatch = useDispatch();

  const getSortColumnHandler = (columnId: string) => () => {
    if (sort.key === columnId) {
      dispatch(updateSetting('sort', { ...sort, order: sort.order === 'asc' ? 'desc' : 'asc' }));
      return;
    }

    dispatch(updateSetting('sort', { key: columnId, order: 'asc' }));
  };

  const dateFilteredRaces = React.useMemo(() => allRaces.filter(
    (race) => moment(date).add(1, 'hour').isBetween(race.startTime, race.endTime),
  ), [date]);

  const sortedRaces = React.useMemo(() => sortRaces(sort, dateFilteredRaces), [sort, dateFilteredRaces]);

  const filteredRaces = React.useMemo(() => filterRaces({
    races: sortedRaces, filters, ownedTracks, ownedCars, favouriteSeries, favouriteCars, favouriteTracks,
  }), [sortedRaces, filters, ownedTracks, ownedCars, favouriteSeries, favouriteCars, favouriteTracks]);

  if (filters.favouriteSeries && filteredRaces.length === 0) {
    return <p>{t('No races this week match your favourite series. Try turning the filter off or adding some.')}</p>;
  }

  if (filters.favouriteCarsOnly && filteredRaces.length === 0) {
    return <p>{t('No races this week match your favourite cars. Try turning the filter off or adding some.')}</p>;
  }

  if (filters.favouriteTracksOnly && filteredRaces.length === 0) {
    return <p>{t('No races this week match your favourite tracks. Try turning the filter off or adding some.')}</p>;
  }

  const chosenColumns = availableColumns.filter((column) => columns.indexOf(column.id) !== -1);

  return (
    <div className={`${styles['table-responsive']} ${raceListingStyles.raceListing}`}>
      <table className={styles.table} style={{ fontSize: '0.8em' }}>
        <thead>
          <tr>
            {chosenColumns.map((column) => (
              <th
                key={column.id}
                id={`raceListing-th-${column.id}`}
                onClick={column.sort ? getSortColumnHandler(column.id) : () => {}}
                className={column.sort ? raceListingStyles.clickableCell : null}
              >
                {t(column.header)}
                <span> </span>
                {sort.key === column.id ? <SortArrow sort={sort} /> : null}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filteredRaces.map((race) => (
            <tr key={race.seriesId}>
              {chosenColumns.map((column) => (
                <column.component
                  key={column.id}
                  race={race}
                  ownedCars={ownedCars}
                  favouriteCars={favouriteCars}
                  ownedTracks={ownedTracks}
                  favouriteTracks={favouriteTracks}
                  favouriteSeries={favouriteSeries}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
