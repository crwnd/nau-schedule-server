import { TSchedule, TWeekSync } from '../models/schedules.js';
import Users from '../models/users.js';
import { GetLecturers } from '../services/nau_api.js';
import { LessonBase, LessonChange, LessonTemplate, OutputDayObject } from '../types.js';

export function resolveTemplate(inputName: string, groupTemplates: Array<LessonTemplate>, facultyTemplates: Array<LessonTemplate>): LessonTemplate | undefined {
    if (inputName.startsWith("-")) {
        return facultyTemplates.find(el => el.id == inputName.slice(1));
    }
    return groupTemplates.find(el => el.id == inputName);
}
export function getweek_number(date: Date): number {
    // Copy the date object to avoid modifying the original
    const copiedDate = new Date(date.getTime());

    // Set the time to 0:00:00 to avoid issues with timezone offsets
    copiedDate.setHours(0, 0, 0, 0);

    // Thursday in current week decides the year.
    copiedDate.setDate(copiedDate.getDate() + 3 - (copiedDate.getDay() + 6) % 7);

    // January 4th is always in week 1.
    const startOfYear = new Date(copiedDate.getFullYear(), 0, 4);

    // Calculate the week number based on the difference between the current date and the start of the year.
    const weekIndex = Math.floor(((copiedDate.getTime() - startOfYear.getTime()) / 86400000 + 1) / 7);

    return weekIndex + 1;
}

export function normalize(arr: Array<any>): Array<OutputDayObject> {
    return arr.map(el =>
    ({
        code: el.code,
        subgroup: el.subgroup || 0,
        used_template: el.template || el.used_template || undefined,
        comment: el.comment || "",
        lecturers: el.lecturers,
        names: el.names,
        time: el.time,
        duration: el.duration,
        places: el.places,
        canceled: el.canceled ?? false,
        lesson_type: el.lesson_type,
        recordings: el.recordings,
    }))
}

export function countweek_number(requestedDay: Date, week_syncs: Array<TWeekSync>) {
    let requestedWeek = getweek_number(requestedDay);
    let lastSync = undefined;
    let requestedweek_number = -1;
    const requestedDayTimestamp = requestedDay.valueOf();
    let syncs = week_syncs.filter(element => ((element[0] - 1970) * 365 * 24 * 60 * 60 * 1000) + (element[1] * 7 * 24 * 60 * 60 * 1000) <= requestedDayTimestamp);
    syncs.sort((sync1, sync2) => (sync1[0] > sync2[0] && sync1[1] > sync2[1]) ? 1 : -1);
    lastSync = syncs[0];
    if (typeof lastSync === 'undefined') { throw "not calibrated!"; }
    requestedweek_number = Math.floor(
        (
            (((requestedDay.getFullYear() - 1970) * 365 * 24 * 60 * 60 * 1000) + (requestedWeek * 7 * 24 * 60 * 60 * 1000))
            -
            (((lastSync[0] - 1970) * 365 * 24 * 60 * 60 * 1000) + (lastSync[1] * 7 * 24 * 60 * 60 * 1000))
        )
        / 1000 / 60 / 60 / 24 / 7
    ) % 2 + lastSync[2];
    if (requestedweek_number >= 3) requestedweek_number = 1;
    return requestedweek_number;
}

export function countday_number(reqDay: number, reqMonth: number, reqYear: number): number {
    let nowThere = new Date();
    nowThere = new Date(nowThere.valueOf() - nowThere.getTimezoneOffset());
    return (new Date((new Date(reqYear, reqMonth - 1, reqDay)).valueOf() - nowThere.getTimezoneOffset() * 60 * 1000)).getDay() || 7;
}

export async function getDayLessons(groupObj: TSchedule, specialityTemplates: Array<LessonTemplate>, reqDay: number, reqMonth: number, reqYear: number, excludeOnetime: boolean, excludePermanent: boolean, showPlace: boolean): Promise<Array<OutputDayObject>> {
    let nowThere = new Date();
    nowThere = new Date(nowThere.valueOf() - nowThere.getTimezoneOffset());
    let requestedDay = new Date((new Date(reqYear, reqMonth - 1, reqDay)).valueOf() - nowThere.getTimezoneOffset() * 60 * 1000);

    const requestedweek_number = countweek_number(requestedDay, groupObj.week_syncs);

    let requestedDayOfweek_number = countday_number(reqDay, reqMonth, reqYear);
    if (requestedDayOfweek_number == 0) requestedDayOfweek_number = 7;
    let requestedDayLessons: Array<OutputDayObject> = [];


    if (!excludePermanent)
        requestedDayLessons.push(...
            normalize(
                groupObj.lessons.add.filter(element =>
                    element.day_number == requestedDayOfweek_number &&
                    element.week_number == requestedweek_number &&
                    new Date((new Date(element.start_date[0], element.start_date[1] - 1, element.start_date[2])).valueOf() - nowThere.getTimezoneOffset() * 60 * 1000) <= requestedDay &&
                    new Date((new Date(element.end_date[0], element.end_date[1] - 1, element.end_date[2])).valueOf() - nowThere.getTimezoneOffset() * 60 * 1000) >= requestedDay
                ).map(lesson => {
                    console.log('lesson', lesson);
                    return Object.assign(
                        {},
                        !lesson.template
                            ?
                            LessonBase
                            :
                            Object.assign(
                                {},
                                LessonBase,
                                lesson.template?.startsWith("-") ? specialityTemplates.find(el => el.id === (lesson.template || "").substring(1)) : groupObj.lesson_templates.find(el => el.id === lesson.template)
                            ),
                        lesson
                    )
                }
                )
            ));
    console.log('requestedDayLessons', requestedDayLessons);
    if (!excludeOnetime)
        // requestedDayLessons.push(...
        //     normalize(groupObj.onetimes.add.filter(el => el.date[0] == requestedDay.getFullYear() && el.date[1] == requestedDay.getMonth() + 1 && el.date[2] == requestedDay.getDate())
        //         .map(lesson => {
        //             return Object.assign({},
        //                 lesson.template === undefined ? sampleOnetimeLesson : Object.assign({},
        //                     sampleOnetimeLesson,
        //                     lesson.template.startsWith("-") ? specialityTemplates.find(el => el.id === (lesson.template || "").substring(1)) : groupObj.lesson_templates.find(el => el.id === lesson.template)
        //                 ),
        //                 lesson
        //             );
        //         })
        //     )
        // );
        if (!excludePermanent) {
            let requestedDayChanges: Array<LessonChange> = groupObj.lessons.change.filter(element =>
                requestedDayLessons.some(el => el.code == element.lesson_code) &&
                new Date((new Date(element.start_date[0], element.start_date[1] - 1, element.start_date[2])).valueOf() - nowThere.getTimezoneOffset() * 60 * 1000) <= requestedDay &&
                new Date((new Date(element.end_date[0], element.end_date[1] - 1, element.end_date[2])).valueOf() - nowThere.getTimezoneOffset() * 60 * 1000) >= requestedDay
            );
            // requestedDayChanges = requestedDayChanges.sort((el1, el2) =>
            //     new Date((new Date(el1.start_date[0], el1.start_date[1] - 1, el1.start_date[2])).valueOf() - nowThere.getTimezoneOffset() * 60 * 1000)
            //         > new Date((new Date(el2.start_date[0], el2.start_date[1] - 1, el2.start_date[2])).valueOf() - nowThere.getTimezoneOffset() * 60 * 1000) ? 1 : -1
            // );
            requestedDayChanges.forEach(change => {
                let lessonIndex: number = 0;
                for (let i = 0; i < requestedDayLessons.length; i++) {
                    if (requestedDayLessons[i].code == change.lesson_code) {
                        lessonIndex = i;
                        break;
                    }
                }
                requestedDayLessons[lessonIndex] = Object.assign(
                    {},
                    requestedDayLessons[lessonIndex],
                    Object.fromEntries(
                        Object.entries(change).filter(el => ['template', 'lecturers', 'names', 'comment', 'time', 'duration', 'places', 'lesson_type', 'recordings', 'canceled'].includes(el[0]))
                    )
                );
            });
        }

    // if (!excludeOnetime) groupObj.onetimes.change.filter(element =>
    //     requestedDayLessons.some(el => el.code == element.lesson_code) &&
    //     element.date[0] == requestedDay.getFullYear() && element.date[1] == requestedDay.getMonth() + 1 && element.date[2] == requestedDay.getDate()
    // ).forEach(change => {
    //     let lessonIndex: number = 0;
    //     for (let i = 0; i < requestedDayLessons.length; i++) {
    //         if (requestedDayLessons[i].code == change.lesson_code) {
    //             lessonIndex = i;
    //             break;
    //         }
    //     }
    //     requestedDayLessons[lessonIndex] = Object.assign(
    //         {},
    //         requestedDayLessons[lessonIndex],
    //         Object.fromEntries(
    //             Object.entries(change).filter(el => el[0] !== "lesson_code" && el[0] !== "date")
    //         )
    //     );
    // });

    const lecturers = await Users.find({ code: { $in: requestedDayLessons.map(el => el.lecturers).flat() } }).select({ code: 1, name: 1, surname: 1, patronymic: 1, _id: 0 });
    requestedDayLessons = requestedDayLessons.map(el => Object.assign({}, el, { lecturers: lecturers.filter(lecturer => (el.lecturers || []).some(el => el === lecturer.code)) }));

    if (!showPlace)
        requestedDayLessons = requestedDayLessons.map(el => Object.assign({}, el, { places: [] }));

    requestedDayLessons = requestedDayLessons.sort(
        (a, b) => {
            if (a.time < b.time) {
                return -1;
            } else if (a.time > b.time) {
                return 1;
            }
            return 0;
        }
    );

    return requestedDayLessons;
}

export function daysInMonth(m: number, y: number): number {
    switch (m) {
        case 2:
            return ((y & 3) == 0 && ((y % 25) != 0 || (y & 15) == 0)) ? 29 : 28;
        case 9: case 4: case 6: case 11:
            return 30;
        default:
            return 31
    }
}

export function isDateValid(d: number, m: number, y: number): boolean {
    return m > 0 && m <= 12 && d > 0 && d <= daysInMonth(m, y);
}

export function getRandomInt(min: number, max: number): number {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min) + min);
}

export function makeid(length: number, clearOnlySymbols: boolean) {
    let result = '';
    const characters = clearOnlySymbols ? 'ABCDEFGHKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz123456789' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
        counter += 1;
    }
    return result;
}

export function isJson(str: string): boolean {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

export function camelToSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

export const getMonday = (d: Date) => {
    const dt = new Date(d);
    const day = dt.getDay()
    const diff = dt.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(dt.setDate(diff));
}
