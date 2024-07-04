#!/usr/bin/env node

const { program } = require('commander'); // 解析命令行参
const chalk = require('chalk'); // 终端标题美化
const { updateVersion } = require('./src/utils');
const { init } = require('./src/init');
const pkg = require('./package.json');

program.version(updateVersion(pkg.version), '-v, --version');

program
  .name("dnhyxc-ci")
  .description("自动部署工具")
  .usage("<command> [options]")
  .on('--help', () => {
    console.log(`\r\nRun ${chalk.cyan(`dnhyxc-ci <command> --help`)} for detailed usage of given command\r\n`);
  });

const publishCallback = async (name, option) => {
  await init(name, option);
};

program
  .command('publish <name>')
  .description('项目部署')
  .option('-h, --host [host]', '输入host')
  .option('-p, --port [port]', '输入端口号')
  .option('-u, --username [username]', '输入用户名')
  .option('-m, --password [password]', '输入密码')
  .option('-l, --lcalFilePath [lcalFilePath]', '输入本地文件路径')
  .option('-r, --remoteFilePath [remoteFilePath]', '输入服务器目标文件路径')
  .option('-i, --install', '是否需要安装依赖')
  .action(publishCallback);

// 必须写在所有的 program 语句之后，否则上述 program 语句不会执行
program.parse(process.argv);