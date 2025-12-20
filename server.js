const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 数据文件路径
const DATA_DIR = './data';
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const TEAMS_FILE = path.join(DATA_DIR, 'teams.json');
const SCOUTING_DATA_FILE = path.join(DATA_DIR, 'scouting_data.json');

// 创建数据目录
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// 初始化数据文件
function initDataFiles() {
    if (!fs.existsSync(USERS_FILE)) {
        fs.writeFileSync(USERS_FILE, JSON.stringify({}, null, 2));
    }
    if (!fs.existsSync(TEAMS_FILE)) {
        fs.writeFileSync(TEAMS_FILE, JSON.stringify({}, null, 2));
    }
    if (!fs.existsSync(SCOUTING_DATA_FILE)) {
        fs.writeFileSync(SCOUTING_DATA_FILE, JSON.stringify({}, null, 2));
    }
}

// 读取数据文件
function readDataFile(filePath) {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`读取文件 ${filePath} 失败:`, error);
        return {};
    }
}

// 写入数据文件
function writeDataFile(filePath, data) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error(`写入文件 ${filePath} 失败:`, error);
        return false;
    }
}

// 中间件配置
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 初始化数据文件
initDataFiles();

// API 端点

// 获取所有用户
app.get('/api/users', (req, res) => {
    const users = readDataFile(USERS_FILE);
    res.json(users);
});

// 保存所有用户
app.post('/api/users', (req, res) => {
    const users = req.body;
    if (writeDataFile(USERS_FILE, users)) {
        res.json({ success: true, message: '用户数据保存成功' });
    } else {
        res.status(500).json({ success: false, message: '用户数据保存失败' });
    }
});

// 获取所有队伍
app.get('/api/teams', (req, res) => {
    const teams = readDataFile(TEAMS_FILE);
    res.json(teams);
});

// 保存所有队伍
app.post('/api/teams', (req, res) => {
    const teams = req.body;
    if (writeDataFile(TEAMS_FILE, teams)) {
        res.json({ success: true, message: '队伍数据保存成功' });
    } else {
        res.status(500).json({ success: false, message: '队伍数据保存失败' });
    }
});

// 获取所有侦察数据
app.get('/api/scouting-data', (req, res) => {
    const scoutingData = readDataFile(SCOUTING_DATA_FILE);
    res.json(scoutingData);
});

// 保存所有侦察数据
app.post('/api/scouting-data', (req, res) => {
    const scoutingData = req.body;
    if (writeDataFile(SCOUTING_DATA_FILE, scoutingData)) {
        res.json({ success: true, message: '侦察数据保存成功' });
    } else {
        res.status(500).json({ success: false, message: '侦察数据保存失败' });
    }
});

// 保存所有数据（用户、队伍、侦察数据）
app.post('/api/all-data', (req, res) => {
    const { users, teams, scoutingData } = req.body;
    
    let success = true;
    
    if (users) {
        success = success && writeDataFile(USERS_FILE, users);
    }
    
    if (teams) {
        success = success && writeDataFile(TEAMS_FILE, teams);
    }
    
    if (scoutingData) {
        success = success && writeDataFile(SCOUTING_DATA_FILE, scoutingData);
    }
    
    if (success) {
        res.json({ success: true, message: '所有数据保存成功' });
    } else {
        res.status(500).json({ success: false, message: '数据保存失败' });
    }
});

// 获取所有数据（用户、队伍、侦察数据）
app.get('/api/all-data', (req, res) => {
    const users = readDataFile(USERS_FILE);
    const teams = readDataFile(TEAMS_FILE);
    const scoutingData = readDataFile(SCOUTING_DATA_FILE);
    
    res.json({ users, teams, scoutingData });
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
    console.log('API 端点:');
    console.log('  GET /api/users - 获取所有用户');
    console.log('  POST /api/users - 保存所有用户');
    console.log('  GET /api/teams - 获取所有队伍');
    console.log('  POST /api/teams - 保存所有队伍');
    console.log('  GET /api/scouting-data - 获取所有侦察数据');
    console.log('  POST /api/scouting-data - 保存所有侦察数据');
    console.log('  GET /api/all-data - 获取所有数据');
    console.log('  POST /api/all-data - 保存所有数据');
});