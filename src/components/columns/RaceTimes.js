// @flow

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import moment from 'moment';
import type { TimeableRace } from '../../lib/races';
import Modal from '../modal/Modal';
import ClickableCell from './ClickableCell';

import bootstrapStyles from '../../styles/main.module.scss';

type Props = {
  race: {
    ...TimeableRace,
    series: string,
  },
};

export default function NextRace({ race }: Props) {
  const [modalOpen, setModalOpen] = React.useState(false);
  const openModal = () => setModalOpen(true);
  const closeModal = () => setModalOpen(false);
  const { t } = useTranslation();

  if (race.setTimes) {
    const weekStart = moment(moment().utc()).subtract(1, 'days').startOf('isoWeek').add(1, 'days');

    return (
      <>
        <ClickableCell onClick={openModal}>
          {t('Set Times')}
        </ClickableCell>
        <Modal
          isOpen={modalOpen}
          onClose={closeModal}
          title={t('Set times for {{series}}', { series: t(race.series) })}
          doneAction={closeModal}
        >
          <div className={bootstrapStyles['container-fluid']}>
            <ul>
              {race.setTimes.map(
                (time) => (
                  <li key={time.toString()}>
                    {t('{{timeLocal, ddd h:mma}} ({{timeUtc, ddd h:mma z}})', {
                      timeLocal: moment(weekStart).add(time).local().toDate(),
                      timeUtc: moment(weekStart).add(time).utc().toDate(),
                    })}
                  </li>
                ),
              )}
            </ul>
          </div>
        </Modal>
      </>
    );
  }

  if (race.everyTime) {
    return (
      <td>
        <div>
          {t('Every {{every}} starting at {{time, H:mm}} UTC', {
            every: race.everyTime.humanize().replace(/an?\s/, ''),
            time: moment().utc().startOf('day').add(race.offset || 0)
              .toDate(),
          })}
        </div>
      </td>
    );
  }

  return <td>{t('No time data')}</td>;
}
