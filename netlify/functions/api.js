// Local File System Storage for FTC Scout API

const fs = require('fs');
const path = require('path');

// 数据文件路径
const DATA_DIR = path.join(__dirname, '../../data');
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

// 初始化数据
function initData() {
    initDataFiles();
}

// 保存数据
function saveData() {
    console.log('Data saved to file system');
}

// CORS配置
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// 处理OPTIONS请求
function handleOptions(request) {
  return new Response(null, {
    headers: corsHeaders,
  });
}

// 处理API请求
export async function handler(event, context) {
  // 初始化数据
  initData();

  // 处理OPTIONS请求
  if (event.httpMethod === 'OPTIONS') {
    return handleOptions(event);
  }

  // 路由处理
  const path = event.path;
  const method = event.httpMethod;

  // 获取所有用户
  if (path === '/api/users' && method === 'GET') {
    const users = readDataFile(USERS_FILE);
    return new Response(JSON.stringify(users), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }

  // 保存所有用户
  if (path === '/api/users' && method === 'POST') {
    try {
      const users = JSON.parse(event.body);
      if (writeDataFile(USERS_FILE, users)) {
        return new Response(JSON.stringify({ success: true, message: '用户数据保存成功', timestamp: new Date().toISOString() }), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        });
      } else {
        return new Response(JSON.stringify({ success: false, message: '用户数据保存失败' }), {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        });
      }
    } catch (error) {
      return new Response(JSON.stringify({ success: false, message: '用户数据保存失败: ' + error.message }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    }
  }

  // 获取所有队伍
  if (path === '/api/teams' && method === 'GET') {
    const teams = readDataFile(TEAMS_FILE);
    return new Response(JSON.stringify(teams), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }

  // 保存所有队伍
  if (path === '/api/teams' && method === 'POST') {
    try {
      const teams = JSON.parse(event.body);
      if (writeDataFile(TEAMS_FILE, teams)) {
        return new Response(JSON.stringify({ success: true, message: '队伍数据保存成功', timestamp: new Date().toISOString() }), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        });
      } else {
        return new Response(JSON.stringify({ success: false, message: '队伍数据保存失败' }), {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        });
      }
    } catch (error) {
      return new Response(JSON.stringify({ success: false, message: '队伍数据保存失败: ' + error.message }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    }
  }

  // 获取所有侦察数据
  if (path === '/api/scouting-data' && method === 'GET') {
    const scoutingData = readDataFile(SCOUTING_DATA_FILE);
    return new Response(JSON.stringify(scoutingData), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }

  // 保存所有侦察数据
  if (path === '/api/scouting-data' && method === 'POST') {
    try {
      const scoutingData = JSON.parse(event.body);
      if (writeDataFile(SCOUTING_DATA_FILE, scoutingData)) {
        return new Response(JSON.stringify({ success: true, message: '侦察数据保存成功', timestamp: new Date().toISOString() }), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        });
      } else {
        return new Response(JSON.stringify({ success: false, message: '侦察数据保存失败' }), {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        });
      }
    } catch (error) {
      return new Response(JSON.stringify({ success: false, message: '侦察数据保存失败: ' + error.message }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    }
  }

  // 获取所有数据
  if (path === '/api/all-data' && method === 'GET') {
    const users = readDataFile(USERS_FILE);
    const teams = readDataFile(TEAMS_FILE);
    const scoutingData = readDataFile(SCOUTING_DATA_FILE);
    return new Response(JSON.stringify({ users, teams, scoutingData }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }

  // 保存所有数据
  if (path === '/api/all-data' && method === 'POST') {
    try {
        // 验证请求体是否存在
        if (!event.body) {
            return new Response(JSON.stringify({ success: false, message: '请求体不能为空' }), {
                status: 400,
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json',
                },
            });
        }
        
        const data = JSON.parse(event.body);
        
        // 验证数据格式
        if (data.users && typeof data.users !== 'object') {
            return new Response(JSON.stringify({ success: false, message: '用户数据格式不正确' }), {
                status: 400,
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json',
                },
            });
        }
        
        if (data.teams && typeof data.teams !== 'object') {
            return new Response(JSON.stringify({ success: false, message: '队伍数据格式不正确' }), {
                status: 400,
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json',
                },
            });
        }
        
        if (data.scoutingData && typeof data.scoutingData !== 'object') {
            return new Response(JSON.stringify({ success: false, message: '侦察数据格式不正确' }), {
                status: 400,
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json',
                },
            });
        }
        
        // 保存数据
        let success = true;
        if (data.users) {
            success = success && writeDataFile(USERS_FILE, data.users);
        }
        if (data.teams) {
            success = success && writeDataFile(TEAMS_FILE, data.teams);
        }
        if (data.scoutingData) {
            success = success && writeDataFile(SCOUTING_DATA_FILE, data.scoutingData);
        }
        
        if (success) {
            return new Response(JSON.stringify({ success: true, message: '所有数据保存成功', timestamp: new Date().toISOString() }), {
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json',
                },
            });
        } else {
            return new Response(JSON.stringify({ success: false, message: '数据保存失败' }), {
                status: 500,
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json',
                },
            });
        }
    } catch (error) {
        console.error('保存所有数据错误:', error);
        return new Response(JSON.stringify({ success: false, message: '数据保存失败: ' + error.message }), {
            status: 500,
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
            },
        });
    }
  }

  // 未知路由
  return new Response(JSON.stringify({ error: 'Not found' }), {
    status: 404,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}
