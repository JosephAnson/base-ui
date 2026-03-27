'use client';
import * as React from 'react';
import { format } from 'date-fns/format';
import { enUS } from 'date-fns/locale/en-US';
import { html, render as renderTemplate, svg } from 'lit';
import { getMonthWeeks, getWeekdayNames, startOfMonth } from '@base-ui/lit/calendar';
import '@base-ui/lit/localization-provider';
import '@base-ui/lit/select';
import styles from '../../../calendar.module.css';
import indexStyles from './index.module.css';

type Day = 0 | 1 | 2 | 3 | 4 | 5 | 6;

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function StartOfWeekCalendar() {
  const [value, setValue] = React.useState<Date | null>(null);
  const [visibleDate, setVisibleDate] = React.useState(() => startOfMonth(new Date()));
  const [weekStartsOn, setWeekStartsOn] = React.useState<Day>(1);
  const hostRef = React.useRef<HTMLDivElement | null>(null);

  const locale = React.useMemo(
    () => ({ ...enUS, options: { ...enUS.options, weekStartsOn } }),
    [weekStartsOn],
  );

  React.useEffect(() => {
    const host = hostRef.current;

    if (host == null) {
      return undefined;
    }

    const resolvedWeekStartsOn = locale.options?.weekStartsOn === 1 ? 1 : 0;
    const weeks = getMonthWeeks(visibleDate, resolvedWeekStartsOn);
    const weekdays = getWeekdayNames(resolvedWeekStartsOn, locale.code ?? 'en-US');

    renderTemplate(
      html`
        <div class=${indexStyles.Wrapper}>
          <div>
            <label class=${indexStyles.Label} for="start-of-week-trigger">
              First day of the week
            </label>
            <div class=${indexStyles.SelectWrapper}>
              <select-root
                .value=${weekStartsOn}
                .onValueChange=${(nextValue: number) => setWeekStartsOn(Number(nextValue) as Day)}
              >
                <select-trigger id="start-of-week-trigger" class=${indexStyles.Select}>
                  <select-value
                    .formatValue=${(selectedValue: number) => dayNames[Number(selectedValue)] ?? ''}
                  ></select-value>
                  <select-icon class=${indexStyles.SelectIcon}>${chevronUpDownIcon()}</select-icon>
                </select-trigger>
                <select-popup class=${indexStyles.Popup}>
                  <select-group class=${indexStyles.List}>
                    ${dayNames.map(
                      (day, index) => html`
                        <select-item .value=${index} class=${indexStyles.Item}>
                          <select-item-indicator class=${indexStyles.ItemIndicator}>
                            <span class=${indexStyles.ItemIndicatorIcon}>${checkIcon()}</span>
                          </select-item-indicator>
                          <select-item-text class=${indexStyles.ItemText}>${day}</select-item-text>
                        </select-item>
                      `,
                    )}
                  </select-group>
                </select-popup>
              </select-root>
            </div>
          </div>

          <localization-provider .temporalLocale=${locale}>
            <calendar-root
              class=${styles.Root}
              .visibleDate=${visibleDate}
              .value=${value}
              .onValueChange=${(nextValue: Date | null) => setValue(nextValue)}
              .onVisibleDateChange=${(nextVisibleDate: Date) =>
                setVisibleDate(startOfMonth(nextVisibleDate))}
            >
              <header class=${styles.Header}>
                <calendar-decrement-month class=${styles.DecrementMonth}>
                  ${chevronLeftIcon()}
                </calendar-decrement-month>
                <span class=${styles.HeaderLabel}>${format(visibleDate, 'MMMM yyyy')}</span>
                <calendar-increment-month class=${styles.IncrementMonth}>
                  ${chevronRightIcon()}
                </calendar-increment-month>
              </header>
              <calendar-day-grid class=${styles.DayGrid}>
                <calendar-day-grid-header>
                  <calendar-day-grid-header-row class=${styles.DayGridHeaderRow}>
                    ${weekdays.map(
                      (day) => html`
                        <calendar-day-grid-header-cell class=${styles.DayGridHeaderCell}>
                          ${day}
                        </calendar-day-grid-header-cell>
                      `,
                    )}
                  </calendar-day-grid-header-row>
                </calendar-day-grid-header>
                <calendar-day-grid-body class=${styles.DayGridBody}>
                  ${weeks.map(
                    (week) => html`
                      <calendar-day-grid-row class=${styles.DayGridRow}>
                        ${week.map(
                          (day) => html`
                            <calendar-day-grid-cell class=${styles.DayGridCell}>
                              <calendar-day-button .dateValue=${day} class=${styles.DayButton}>
                                ${day.getDate()}
                              </calendar-day-button>
                            </calendar-day-grid-cell>
                          `,
                        )}
                      </calendar-day-grid-row>
                    `,
                  )}
                </calendar-day-grid-body>
              </calendar-day-grid>
            </calendar-root>
          </localization-provider>
        </div>
      `,
      host,
    );

    return () => {
      renderTemplate(html``, host);
    };
  }, [locale, value, visibleDate, weekStartsOn]);

  return <div ref={hostRef} style={{ display: 'contents' }} />;
}

function chevronUpDownIcon() {
  return svg`<svg
    width="8"
    height="12"
    viewBox="0 0 8 12"
    fill="none"
    stroke="currentcolor"
    stroke-width="1.5"
  >
    <path d="M0.5 4.5L4 1.5L7.5 4.5" />
    <path d="M0.5 7.5L4 10.5L7.5 7.5" />
  </svg>`;
}

function checkIcon() {
  return svg`<svg fill="currentcolor" width="10" height="10" viewBox="0 0 10 10">
    <path d="M9.1603 1.12218C9.50684 1.34873 9.60427 1.81354 9.37792 2.16038L5.13603 8.66012C5.01614 8.8438 4.82192 8.96576 4.60451 8.99384C4.3871 9.02194 4.1683 8.95335 4.00574 8.80615L1.24664 6.30769C0.939709 6.02975 0.916013 5.55541 1.19372 5.24822C1.47142 4.94102 1.94536 4.91731 2.2523 5.19524L4.36085 7.10461L8.12299 1.33999C8.34934 0.993152 8.81376 0.895638 9.1603 1.12218Z" />
  </svg>`;
}

function chevronLeftIcon() {
  return svg`<svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentcolor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="m15 18-6-6 6-6" />
  </svg>`;
}

function chevronRightIcon() {
  return svg`<svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentcolor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="m9 18 6-6-6-6" />
  </svg>`;
}
