const axios = require('axios');

function translateMetricName(metric) {
  const map = {
    new_reliability_rating: "可靠性等级",
    new_security_rating: "安全等级",
    new_maintainability_rating: "可维护性等级",
    new_coverage: "新增代码覆盖率",
    new_duplicated_lines_density: "新增重复率",
    new_security_hotspots_reviewed: "安全热点审查率"
  };
  return map[metric] || metric;
}

function convertValueToLetter(value) {
  if (value >= 0 && value <= 1) {
    return 'A'; // 表示优秀
  } else if (value > 1 && value <= 2) {
    return 'B'; // 表示良好
  } else if (value > 2 && value <= 3) {
    return 'C'; // 表示中等
  } else if (value > 3 && value <= 4) {
    return 'D'; // 表示差
  } else {
    return 'F'; // 表示失败
  }
}

function formatConditions(conditions) {
  return conditions.map(cond => {
    const name = translateMetricName(cond.metric);
    const statusMap = { OK: "✅", ERROR: "❌", NO_VALUE: "⚪️" };
    const statusIcon = statusMap[cond.status] || "❔";

    const letterMetrics = [
      "new_reliability_rating",
      "new_security_rating",
      "new_maintainability_rating"
    ];

    let value = cond.value || '无';
    let threshold = cond.errorThreshold || '无';

    if (letterMetrics.includes(cond.metric)) {
      value = convertValueToLetter(parseInt(cond.value));
      threshold = convertValueToLetter(parseInt(cond.errorThreshold));
    }

    return `- ${statusIcon} **${name}**  当前值: ${value}  阈值: ${threshold}`;
  }).join('\n\n');
}


function buildCard(data) {
  const project = data.project.name;
  const branch = data.branch.name;
  const status = data.qualityGate.status === 'OK' ? '✅ 通过' : '❌ 不通过';
  const time = new Date(data.analysedAt).toLocaleString('zh-CN');
  const dashboardUrl = data.branch.url;

  const conditionDetails = formatConditions(data.qualityGate.conditions);

  return {
    msg_type: 'interactive',
    card: {
      schema: '2.0',
      config: {
        update_multi: true,
        style: {
          text_size: {
            normal_v2: {
              default: 'normal',
              pc: 'normal',
              mobile: 'heading'
            }
          }
        }
      },
      header: {
        title: {
          tag: 'plain_text',
          content: 'SonarQube 分析报告'
        },
        subtitle: {
          tag: 'plain_text',
          content: `${project} · PR #${data.branch.name}`
        },
        template: data.qualityGate.status === 'OK' ? 'green' : 'red',
        padding: '12px 12px 12px 12px'
      },
      body: {
        direction: 'vertical',
        padding: '12px 12px 12px 12px',
        elements: [
          {
            tag: 'markdown',
            content: `**📌 分析摘要**\n\n- **项目**：${project}\n- **分支类型**：Pull Request\n- **编号**：#${data.branch.name}\n- **提交版本**：${data.revision}\n- **状态**：${status}\n- **分析时间**：${time}\n- **质量门**：${status}`
          },
          {
            tag: 'markdown',
            content: `**🧪 质量门条件详情：**\n\n${conditionDetails}`
          },
          {
            tag: 'markdown',
            content: `**🔧 构建信息**\n\n- CI 检测：Gitlab CI\n- SCM 工具：Git`
          },
          {
            tag: 'button',
            text: {
              tag: 'plain_text',
              content: '📊 查看仪表盘'
            },
            type: 'primary',
            width: 'default',
            size: 'medium',
            behaviors: [
              {
                type: 'open_url',
                default_url: dashboardUrl
              }
            ]
          }
        ]
      }
    }
  };
}

async function sendFeishuCard(data) {
  const webhookUrl = process.env.FEISHU_WEBHOOK;

  console.log('📝 收到的数据：');
  console.dir(data, { depth: null });

  const card = buildCard(data);

  if (!webhookUrl) {
    console.error('❌ 未设置 FEISHU_WEBHOOK 环境变量！');
    return;
  }

  try {
    const res = await axios.post(webhookUrl, card);
    console.log('✅ 飞书卡片发送成功，响应状态：', res.status);
  } catch (err) {
    console.error('❌ 飞书卡片发送失败：', err.message);
    if (err.response) {
      console.error('响应内容：', err.response.data);
    }
  }
}

module.exports = { sendFeishuCard };
