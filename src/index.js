// const pify =require('pify')

const ics = require('ics')
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
				fs.writeFileSync(path.join(this.targetPath, fileName.replace(path.extname(fileName), '.ics')), cal.replace(/VERSION:(.*)/g, (match, type) => {
					return `${match}\nX-APPLE-CALENDAR-COLOR:#FF6A6A`
				}))
			}).catch(e => {
				console.error(e);
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
						events.push({ title: '放假', start: [year, month, Number(day), 0, 0], duration: { days: 1 }, description: 'HOLIDAY', status: 'CONFIRMED' })
					});

					weekday.forEach(day => {
						events.push({ title: '上班', start: [year, month, Number(day), 0, 0], duration: { days: 1 }, description: 'WEEKDAY', status: 'CONFIRMED' })
					});
				})
			})

			holidayMap[fileName] = events;
		})

		return holidayMap;
	}

	transform(events) {
		return new Promise((resolve, reject) => {
			ics.createEvents(events, (err, value) => {
				if (!err) {
					resolve(value)
				} else {
					reject(err);
				}
			})
		})
	}
}

module.exports = ChinaHolidy;