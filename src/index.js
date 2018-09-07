// const pify =require('pify')

const iCalTookit = require('ical-toolkit')
const uuid = require('uuid/v4')
const path = require('path')
const fs = require('fs')

class ChinaHolidy {
	constructor() {
		this.configPath = path.resolve('./holidays');
		this.targetPath = path.resolve('./calendars');

		const configs = this.readConfig();
		const holidayMap = this.flatten(configs);

		Object.keys(holidayMap).forEach(fileName => {
			let events = holidayMap[fileName];

			this.transform(events).then(cal => {
				fs.writeFileSync(path.join(this.targetPath, fileName.replace(path.extname(fileName), '.ics')), cal)
			}).catch(e => {
				console.error(`转换失败：${e && e.message}`);
			})
		})
	}

	readConfig() {
		const dirs = fs.readdirSync(this.configPath);
		const result = {};

		dirs.forEach(target => {
			if (target.endsWith('.json')) {
				let filePath = path.join(this.configPath, target);
				if (fs.statSync(filePath).isFile()) {
					let content = fs.readFileSync(filePath);

					try {
						result[target] = JSON.parse(content);
					} catch (e) {
						console.error(`转换文件${target}失败，请检查是否为标准的JSON格式`);
					}
				}
			}
		})

		return result;
	}

	flatten(json) {
		const holidayMap = {};

		Object.keys(json).forEach(fileName => {
			const data = json[fileName];
			const events = [];

			Object.keys(data).forEach(year => {
				year = Number(year);

				const yearData = data[year];

				Object.keys(yearData).forEach(month => {
					month = Number(month);

					const monthData = yearData[month];
					const holiday = monthData.holiday || [];
					const weekday = monthData.weekday || [];

					holiday.forEach(day => {
						events.push({
							uid: uuid(),
							summary: '放假',
							start: new Date(year, month - 1, Number(day), 8), // 要加8小时，ical-toolkit时间转换用的是getUTCDate
							end: new Date(year, month - 1, Number(day) + 1, 8),
							allDay: true,
							description: 'HOLIDAY',
							transp: 'OPAQUE',
							status: 'CONFIRMED'
						})
					});

					weekday.forEach(day => {
						events.push({
							uid: uuid(),
							summary: '上班',
							start: new Date(year, month - 1, Number(day), 8),
							end: new Date(year, month - 1, Number(day) + 1, 8),
							allDay: true,
							description: '调假',
							transp: 'OPAQUE',
							status: 'CONFIRMED'
						})
					});
				})
			})

			holidayMap[fileName] = events;
		})

		return holidayMap;
	}

	transform(events) {
		return new Promise(resolve => {
			let builder = iCalTookit.createIcsFileBuilder();
			builder.spacers = false;
			builder.throwError = true;

			builder.calname = "放假安排";
			builder.timezone = 'Asia/Shanghai';
			builder.method = 'publish';
			builder.prodid = 'ChinaHoliday';
			builder.additionalTags = { "X-APPLE-CALENDAR-COLOR": "#CC73E1" };

			events.forEach(event => builder.events.push(event));

			resolve(builder.toString());
		})
	}
}

module.exports = ChinaHolidy;