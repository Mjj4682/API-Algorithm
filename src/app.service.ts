import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';

@Injectable()
export class AppService {
  constructor(private readonly httpService: HttpService) {}

  async getBusInfo() {
    const busRouteList = (
      await this.httpService
        .get(
          `http://ws.bus.go.kr/api/rest/busRouteInfo/getBusRouteList?resultType=json&ServiceKey=${process.env.ServiceKey}`,
        )
        .toPromise()
    ).data.msgBody.itemList;
    const makeRamdonArray = (array: Array<string>) => {
      array.sort(() => Math.random() - 0.5);
    };
    makeRamdonArray(busRouteList);

    const randomBusRouteIdList = []; // 1단계
    for (let i = 0; i < 3; i++) {
      randomBusRouteIdList.push(busRouteList[i].busRouteId);
    }

    const allArsIdList = [];
    const arrInfoByRouteList = [];
    for (const busRouteId of randomBusRouteIdList) {
      const arrInfoByRoute = (
        await this.httpService
          .get(
            `http://ws.bus.go.kr/api/rest/arrive/getArrInfoByRouteAll?resultType=json&serviceKey=${process.env.ServiceKey}&busRouteId=${busRouteId}`,
          )
          .toPromise()
      ).data.msgBody.itemList;
      arrInfoByRouteList.push(...arrInfoByRoute);
      arrInfoByRoute.forEach((el) => {
        if (el.arsId !== '0') {
          allArsIdList.push(el.arsId);
        }
      });
    }
    const countObj = {};
    for (const arsId of allArsIdList) {
      const stationinfo = (
        await this.httpService
          .get(
            `http://ws.bus.go.kr/api/rest/stationinfo/getStationByUid?resultType=json&serviceKey=${process.env.ServiceKey}&arsId=${arsId}`,
          )
          .toPromise()
      ).data.msgBody.itemList;
      let count = 0;
      if (stationinfo !== null) {
        stationinfo.forEach((el) => {
          const firstTime = el.arrmsg1.split('분');
          const secondeTime = el.arrmsg2.split('분');
          if (
            firstTime[0] === '곧 도착' ||
            firstTime[0] === '1' ||
            firstTime[0] === '2' ||
            firstTime[0] === '3' ||
            firstTime[0] === '4'
          ) {
            count++;
          }
          if (
            secondeTime[0] === '곧 도착' ||
            secondeTime[0] === '1' ||
            secondeTime[0] === '2' ||
            secondeTime[0] === '3' ||
            secondeTime[0] === '4'
          ) {
            count++;
          }
        });
        countObj[arsId] = count;
      }
    }
    const sortArray = Object.entries(countObj).sort(([, a], [, b]) => +b - +a);
    const mostThreeStation = []; // 2단계
    for (let i = 0; i < 2; i++) {
      mostThreeStation.push(sortArray[i][0]);
    }
    const answer = []; // 3단계
    for (const InfoByRoute of arrInfoByRouteList) {
      for (const station of mostThreeStation) {
        if (InfoByRoute.arsId === station) {
          if (InfoByRoute.traTime2 === '0') {
            InfoByRoute.traTime2 = '99999999';
          }
          answer.push({
            버스번호: InfoByRoute.rtNm,
            번호판: InfoByRoute.plainNo1,
            도착예정시간: Number(InfoByRoute.traTime1),
          });
          answer.push({
            버스번호: InfoByRoute.rtNm,
            번호판: InfoByRoute.plainNo2,
            도착예정시간: Number(InfoByRoute.traTime2),
          });
        }
      }
    }
    answer.sort((a, b) => {
      return a.도착예정시간 - b.도착예정시간;
    });
    return answer;
  }
}
