'use client';
import * as React from 'react';
import { format } from 'date-fns/format';
import { fr } from 'date-fns/locale/fr';
import { html, render as renderTemplate, svg } from 'lit';
import { getMonthWeeks, getWeekdayNames, startOfMonth } from '@base-ui/lit/calendar';
import '@base-ui/lit/localization-provider';
import styles from '../../../calendar.module.css';

export default function ExampleCalendar() {
  const [value, setValue] = React.useState<Date | null>(null);
  const [visibleDate, setVisibleDate] = React.useState(() => startOfMonth(new Date()));
  const hostRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const host = hostRef.current;

    if (host == null) {
      return undefined;
    }

    const weekStartsOn = fr.options?.weekStartsOn === 1 ? 1 : 0;
    const weeks = getMonthWeeks(visibleDate, weekStartsOn);
    const weekdays = getWeekdayNames(weekStartsOn, fr.code ?? 'fr');

    renderTemplate(
      html`
        <localization-provider .temporalLocale=${fr}>
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
              <span class=${styles.HeaderLabel}>
                ${format(visibleDate, 'MMMM yyyy', { locale: fr })}
              </span>
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
      `,
      host,
    );

    return () => {
      renderTemplate(html``, host);
    };
  }, [value, visibleDate]);

  return <div ref={hostRef} style={{ display: 'contents' }} />;
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
