// @flow

import moment from 'moment';

import season from '../data/season.json';
import raceLengths from '../data/racelengths.json';
import levelToClass, { levelToClassNumber } from './levelToClass';
import raceTimesArray from '../data/racetimes.json';
import offWeeksById from '../data/offWeeks';

const { duration } = moment;

const raceTimesById = raceTimesArray.reduce((races, race) => ({ ...races, [race.seriesId]: race }), {});

function getStartOfWeek(date: moment$Moment) {
  return moment(date).subtract(1, 'days').startOf('isoWeek').add(1, 'days');
}

export type SeriesRace = {
  series: string,
  seriesId: number,
  track: string,
  trackId: number,
  week: number,
  startTime: moment,
  weekLength: moment,
  endTime: moment,
  official: boolean,
  licenceLevel: number,
  licenceClassNumber: number,
  licenceClass: string,
  type: string,
  fixed: boolean,
  carClasses: Array<string>,
  carIds: Array<number>,
  seriesStart: moment$MomentDuration,
  seriesEnd: moment,
  seasonId: number,
  everyTime: moment$MomentDuration | null,
  offset: moment$MomentDuration | null,
  setTimes: Array<moment$MomentDuration> | null,
  raceLength: { laps: string } | { minutes: string },
};

export type TimeableRace = {
  seriesId: number,
  everyTime: moment$MomentDuration | null,
  offset: moment$MomentDuration | null,
  setTimes: Array<moment$MomentDuration> | null,
}

function getNextRaceFromRecur(
  now: moment$Moment,
  everyTime: moment$MomentDuration,
  offset: moment$MomentDuration | null
): moment$Moment | null {
  const startOfWeek = getStartOfWeek(now);

  const nextDate = offset ? startOfWeek.clone().add(offset) : startOfWeek.clone();
  const endDate = startOfWeek.clone().add({ weeks: 1, days: 1 });

  while (nextDate.isBefore(now) && nextDate.isBefore(endDate)) {
    nextDate.add(everyTime);
  }

  if (nextDate.isBefore(now)) {
    return null;
  }

  return nextDate;
}

function getNextRaceSetTimes(now: moment$Moment, setTimes: Array<moment$MomentDuration>): moment$Moment | null {
  const startOfWeek = getStartOfWeek(now);

  const nextTime = setTimes.find((time) => startOfWeek.clone().add(time).isAfter(now));

  if (nextTime) {
    return startOfWeek.clone().add(nextTime);
  }

  const firstNextWeek = startOfWeek.clone().add(1, 'weeks').add(setTimes[0]);

  if (firstNextWeek.isAfter(now)) {
    return firstNextWeek;
  }

  return null;
}

export function getNextRace(date: moment$Moment, race: TimeableRace): moment$Moment|null {
  if (race.everyTime) {
    return getNextRaceFromRecur(date, race.everyTime, race.offset);
  }

  if (race.setTimes) {
    return getNextRaceSetTimes(date, race.setTimes);
  }

  return null;
}

const categoryMap = new Map();
categoryMap.set(1, 'Oval');
categoryMap.set(2, 'Road');
categoryMap.set(3, 'Dirt');
categoryMap.set(4, 'RX');

const getType = (catId: number): ?string => {
  return categoryMap.get(catId);
};

export default season.reduce((carry, series) => {
  const raceTimes = raceTimesById[series.seriesid] || {};
  const raceOffWeekData = offWeeksById[series.seasonid] || {};

  const seriesName = series.seriesname;
  const seriesStart = moment(series.start, 'x').utc().startOf('day');

  if (raceOffWeekData.weekStartOffset) {
    seriesStart.add(raceOffWeekData.weekStartOffset);
  }

  const seriesEnd = moment(series.end, 'x').utc().startOf('isoWeek').add({ days: 1 });

  if (raceOffWeekData.weekEndOffset) {
    seriesEnd.add(raceOffWeekData.weekEndOffset);
  }

  const offWeeks = raceOffWeekData.offWeeks || [];
  const raceWeekLength = Math.round(moment(seriesEnd).diff(seriesStart) / (series.tracks.length + offWeeks.length));

  const allRaceWeeks = series.tracks.map((track) => track.raceweek)
    .concat(offWeeks.map((offWeek) => offWeek - 1));

  allRaceWeeks.sort((a, b) => a - b);

  const raceLengthSeries = raceLengths[series.seasonid];

  return carry.concat(series.tracks.map((track) => {
    const realRaceWeek = allRaceWeeks.indexOf(track.raceweek);

    const startTime = moment(seriesStart).add(raceWeekLength * realRaceWeek, 'ms').startOf('day').utc();
    const weekLength = duration(raceWeekLength);

    const type = getType(series.catid);

    return {
      series: seriesName,
      seriesId: series.seriesid,
      track: track.name,
      trackId: track.pkgid,
      week: track.raceweek,
      startTime,
      weekLength,
      endTime: moment(startTime).add(weekLength),
      official: series.isOfficial,
      licenceLevel: series.minlicenselevel,
      licenceClassNumber: levelToClassNumber(series.minlicenselevel),
      licenceClass: levelToClass(series.minlicenselevel, true),
      type,
      fixed: series.isFixedSetup,
      carClasses: series.carclasses.map(({ shortname }) => shortname),
      carIds: series.cars.map(({ sku }) => sku),
      seriesStart,
      seriesEnd,
      seasonId: series.seasonid,
      everyTime: raceTimes.everytime ? moment.duration(raceTimes.everytime) : null,
      offset: raceTimes.offset ? moment.duration(raceTimes.offset) : null,
      setTimes: raceTimes.setTimes ? raceTimes.setTimes.map((setTime) => moment.duration(setTime)) : null,
      raceLength: raceLengthSeries ? raceLengthSeries[track.raceweek] : null,
    };
  }));
}, []);
