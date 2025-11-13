import dayjs, { Dayjs } from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import isBetween from 'dayjs/plugin/isBetween';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isBetween);

// ✅ 커스텀 isDST 플러그인
function isDSTPlugin(_, Dayjs, dayjsFactory) {
  Dayjs.prototype.isDST = function () {
    const tz = this.$x?.$timezone; // dayjs.tz()로 생성된 경우만 가능
    if (!tz) {
      throw new Error('isDST()는 timezone 플러그인과 함께 tz()를 사용해야 합니다.');
    }

    const year = this.year();
    const janOffset = dayjsFactory.tz(`${year}-01-01`, tz).utcOffset();
    const julOffset = dayjsFactory.tz(`${year}-07-01`, tz).utcOffset();
    const currentOffset = this.utcOffset();

    // offset이 더 큰 경우 DST 적용 중
    return Math.min(janOffset, julOffset) !== currentOffset;
  };
}

dayjs.extend(isDSTPlugin);

export { dayjs, Dayjs };
