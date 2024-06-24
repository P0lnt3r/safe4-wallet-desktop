import { format } from 'date-fns';

const Date_Format_Pattern = "yyyy-MM-dd";
const DateTime_Format_Pattern = "yyyy-MM-dd HH:mm:ss";

export function TimestampTheEndOf(datetime: string): number {
  const _datetime = datetime + "T23:59:59";
  const date = new Date(_datetime);
  return date.getTime();
}

export function TimestampTheStartOf(datetime: string): number {
  const _datetime = datetime + "T00:00:00";
  const date = new Date(_datetime);
  return date.getTime();
}

export function GetNowDate(): string {
  return DateFormat(new Date());
}

export function GetNextMonth(): string {
  const date = new Date(); // 获取当前日期
  let year = date.getFullYear();
  let month = date.getMonth() + 1; // getMonth() 返回的月份是从 0 开始的
  // 如果当前月份是 12 月，则下个月是 1 月，年份增加 1
  if (month === 12) {
    month = 1;
    year++;
  } else {
    month++;
  }
  // 将月份格式化为两位数
  const formattedMonth = month < 10 ? `0${month}` : month;
  return `${year}-${formattedMonth}`;
}

export function DateTimeFormat(date: Date | number, pattern?: string) {
  pattern = pattern ?? DateTime_Format_Pattern;
  return format(date instanceof Number ? new Date(date) : date, pattern);
}

export function DateFormat(date: Date | number, pattern?: string) {
  pattern = pattern ?? Date_Format_Pattern;
  return format(date instanceof Number ? new Date(date) : date, pattern);
}


