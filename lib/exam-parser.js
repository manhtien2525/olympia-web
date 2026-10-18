const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

function parseExamExcel(filePath) {
  if (!fs.existsSync(filePath)) {
    console.warn(`File not found: ${filePath}, using fallback sample exam.`);
    return getSampleExam();
  }

  try {
    const wb = xlsx.readFile(filePath);
    const result = {
      starting: {
        individual: { 0: [], 1: [], 2: [], 3: [] },
        common: []
      },
      obstacle: {
        rounds: []
      },
      acceleration: [],
      finish: {
        rounds: { 0: [], 1: [], 2: [], 3: [] }
      },
      subQuestions: []
    };

    // 1. Khởi động
    if (wb.Sheets['Khởi động']) {
      const rows = xlsx.utils.sheet_to_json(wb.Sheets['Khởi động'], { header: 1 });
      let currentSection = 'individual';
      let currentStudent = 0;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i] || [];
        const firstCol = String(row[0] || '').trim().toUpperCase();

        if (firstCol.includes('LƯỢT CHUNG')) {
          currentSection = 'common';
          continue;
        }
        if (firstCol.includes('THÍ SINH 1')) { currentStudent = 0; continue; }
        if (firstCol.includes('THÍ SINH 2')) { currentStudent = 1; continue; }
        if (firstCol.includes('THÍ SINH 3')) { currentStudent = 2; continue; }
        if (firstCol.includes('THÍ SINH 4')) { currentStudent = 3; continue; }

        if (row[1] && row[1].toString().trim().length > 0 && row[0] !== 'STT') {
          const qObj = {
            id: row[0] || (currentSection === 'common' ? result.starting.common.length + 1 : result.starting.individual[currentStudent].length + 1),
            question: String(row[1] || '').trim(),
            answer: String(row[2] || '').trim(),
            image: row[3] ? String(row[3]).trim() : '',
            sound: row[4] ? String(row[4]).trim() : ''
          };
          if (currentSection === 'common') {
            result.starting.common.push(qObj);
          } else {
            result.starting.individual[currentStudent].push(qObj);
          }
        }
      }
    }

    // 2. Vượt chướng ngại vật
    if (wb.Sheets['Vượt chướng ngại vật']) {
      const rows = xlsx.utils.sheet_to_json(wb.Sheets['Vượt chướng ngại vật'], { header: 1 });
      let currentObstacle = null;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i] || [];
        const firstCol = String(row[0] || '').trim().toUpperCase();

        if (firstCol.includes('CHƯỚNG NGẠI VẬT')) {
          if (currentObstacle) result.obstacle.rounds.push(currentObstacle);
          currentObstacle = {
            name: firstCol,
            image: row[2] ? String(row[2]).trim() : 'cnv.jpg',
            answer: '',
            hint: '',
            rows: []
          };
          continue;
        }

        if (currentObstacle && firstCol.includes('HÀNG NGANG')) {
          const rowName = firstCol;
          const qText = row[1] ? String(row[1]).trim() : '';
          const aText = row[2] ? String(row[2]).trim() : '';
          const sound = row[3] ? String(row[3]).trim() : '';
          currentObstacle.rows.push({
            id: currentObstacle.rows.length + 1,
            name: rowName,
            question: qText,
            answer: aText,
            charCount: aText.replace(/\s+/g, '').length,
            sound: sound,
            revealed: false
          });
        } else if (currentObstacle && row[1] && String(row[1]).trim().toLowerCase().includes('đáp án')) {
          currentObstacle.answer = String(row[2] || '').trim();
        }
      }
      if (currentObstacle) result.obstacle.rounds.push(currentObstacle);
    }

    // 3. Tăng tốc
    if (wb.Sheets['Tăng tốc']) {
      const rows = xlsx.utils.sheet_to_json(wb.Sheets['Tăng tốc'], { header: 1 });
      for (let i = 3; i < rows.length; i++) {
        const row = rows[i] || [];
        if (row[0] && String(row[0]).trim().length > 0) {
          result.acceleration.push({
            id: i - 2,
            title: String(row[0]).trim(),
            question: row[1] ? String(row[1]).trim() : `Câu hỏi ${row[0]}`,
            answer: row[2] ? String(row[2]).trim() : '',
            answerImage: row[3] ? String(row[3]).trim() : '',
            media: row[4] ? String(row[4]).trim() : '',
            time: parseInt(row[5]) || 30
          });
        }
      }
    }

    // 4. Về đích
    if (wb.Sheets['Về đích']) {
      const rows = xlsx.utils.sheet_to_json(wb.Sheets['Về đích'], { header: 1 });
      let currentStudent = 0;
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i] || [];
        const firstCol = String(row[0] || '').trim().toUpperCase();

        if (firstCol.includes('LƯỢT 1')) currentStudent = 0;
        else if (firstCol.includes('LƯỢT 2')) currentStudent = 1;
        else if (firstCol.includes('LƯỢT 3')) currentStudent = 2;
        else if (firstCol.includes('LƯỢT 4')) currentStudent = 3;
        else if (firstCol.includes('CÂU HỎI') && row[1]) {
          const points = firstCol.includes('30') ? 30 : 20;
          result.finish.rounds[currentStudent].push({
            id: result.finish.rounds[currentStudent].length + 1,
            points: points,
            question: String(row[1] || '').trim(),
            answer: String(row[2] || '').trim(),
            media: row[3] ? String(row[3]).trim() : '',
            note: row[4] ? String(row[4]).trim() : '',
            time: points === 30 ? 20 : 15
          });
        }
      }
    }

    // If template file had no questions filled in yet, enrich with sample questions
    if (result.starting.individual[0].length === 0) {
      return getSampleExam();
    }

    return result;
  } catch (err) {
    console.error('Error parsing Excel:', err);
    return getSampleExam();
  }
}

function getSampleExam() {
  return {
    starting: {
      individual: {
        0: [
          { id: 1, question: "Thủ đô của nước Cộng hòa Xã hội Chủ nghĩa Việt Nam là gì?", answer: "Hà Nội", image: "", sound: "" },
          { id: 2, question: "Nguyên tố hóa học nào có ký hiệu là Au?", answer: "Vàng", image: "", sound: "" },
          { id: 3, question: "Hành tinh nào gần Mặt Trời nhất trong Hệ Mặt Trời?", answer: "Sao Thủy (Mercury)", image: "", sound: "" }
        ],
        1: [
          { id: 1, question: "Sông nào dài nhất Việt Nam chảy hoàn toàn trong lãnh thổ nước ta?", answer: "Sông Đồng Nai", image: "", sound: "" },
          { id: 2, question: "Công thức hóa học của nước là gì?", answer: "H2O", image: "", sound: "" },
          { id: 3, question: "Tác phẩm 'Truyện Kiều' do đại thi hào nào sáng tác?", answer: "Nguyễn Du", image: "", sound: "" }
        ],
        2: [
          { id: 1, question: "Đỉnh núi nào được mệnh danh là nóc nhà của Đông Dương?", answer: "Fansipan", image: "", sound: "" },
          { id: 2, question: "Đơn vị đo cường độ dòng điện trong hệ SI là gì?", answer: "Ampe (A)", image: "", sound: "" },
          { id: 3, question: "Đại dương nào có diện tích lớn nhất thế giới?", answer: "Thái Bình Dương", image: "", sound: "" }
        ],
        3: [
          { id: 1, question: "Ai là người chỉ huy chiến thắng Bạch Đằng năm 938?", answer: "Ngô Quyền", image: "", sound: "" },
          { id: 2, question: "Kim loại nào dẫn điện tốt nhất ở điều kiện thường?", answer: "Bạc (Ag)", image: "", sound: "" },
          { id: 3, question: "Số nguyên tố nhỏ nhất là số mấy?", answer: "2", image: "", sound: "" }
        ]
      },
      common: [
        { id: 1, question: "Vận tốc ánh sáng trong chân không xấp xỉ bao nhiêu km/s?", answer: "300.000 km/s", image: "", sound: "" },
        { id: 2, question: "Năm 1010, vua Lý Thái Tổ dời đô từ Hoa Lư về đâu?", answer: "Thăng Long", image: "", sound: "" },
        { id: 3, question: "ADN có cấu trúc xoắn kép được khám phá bởi ai?", answer: "Watson và Crick", image: "", sound: "" },
        { id: 4, question: "Tỉnh nào có diện tích tự nhiên lớn nhất Việt Nam hiện nay?", answer: "Nghệ An", image: "", sound: "" }
      ]
    },
    obstacle: {
      rounds: [
        {
          name: "CHƯỚNG NGẠI VẬT 1",
          image: "cnv.jpg",
          answer: "QUỐC KỲ",
          hint: "Biểu tượng thiêng liêng của một quốc gia",
          rows: [
            { id: 1, name: "Hàng ngang 1", question: "Màu cờ đỏ tượng trưng cho máu và nhiệt huyết cách mạng, màu gì của ngôi sao tượng trưng cho linh hồn dân tộc?", answer: "VÀNG", charCount: 4, sound: "", revealed: false },
            { id: 2, name: "Hàng ngang 2", question: "Hình tượng ngôi sao trên lá cờ Tổ quốc Việt Nam có bao nhiêu cánh?", answer: "NĂM CÁNH", charCount: 7, sound: "", revealed: false },
            { id: 3, name: "Hàng ngang 3", question: "Tên bài Quốc ca của nước Cộng hòa Xã hội Chủ nghĩa Việt Nam là gì?", answer: "TIẾN QUÂN CA", charCount: 11, sound: "", revealed: false },
            { id: 4, name: "Hàng ngang 4", question: "Cột cờ Lũng Cú thuộc tỉnh nào của vùng địa đầu Tổ quốc?", answer: "HÀ GIANG", charCount: 7, sound: "", revealed: false }
          ]
        }
      ]
    },
    acceleration: [
      { id: 1, title: "Tăng tốc 1", question: "Sắp xếp các chữ cái sau thành một từ có nghĩa trong tiếng Việt: T - H - À - N - H - C - Ô - N - G", answer: "THÀNH CÔNG", answerImage: "", media: "", time: 30 },
      { id: 2, title: "Tăng tốc 2", question: "Tìm số tiếp theo trong dãy số: 2, 4, 8, 16, 32, ...?", answer: "64", answerImage: "", media: "", time: 30 },
      { id: 3, title: "Tăng tốc 3", question: "Đây là hình ảnh của địa danh lịch sử nổi tiếng nào?", answer: "CỘT CỜ HÀ NỘI", answerImage: "", media: "", time: 30 },
      { id: 4, title: "Tăng tốc 4", question: "Xác định tên viết tắt của tổ chức quốc tế gìn giữ hòa bình lớn nhất thế giới thành lập năm 1945?", answer: "LHQ (UN)", answerImage: "", media: "", time: 40 }
    ],
    finish: {
      rounds: {
        0: [
          { id: 1, points: 20, question: "Chiến dịch Điện Biên Phủ toàn thắng vào ngày tháng năm nào?", answer: "7/5/1954", media: "", note: "Lịch sử Việt Nam", time: 15 },
          { id: 2, points: 20, question: "Tam giác có độ dài ba cạnh lần lượt là 3cm, 4cm, 5cm là loại tam giác gì?", answer: "Tam giác vuông", media: "", note: "Toán học", time: 15 },
          { id: 3, points: 30, question: "Ai là tác giả của bản 'Tuyên ngôn Độc lập' khai sinh ra nước Việt Nam Dân chủ Cộng hòa?", answer: "Chủ tịch Hồ Chí Minh", media: "", note: "Chính trị - Lịch sử", time: 20 }
        ],
        1: [
          { id: 1, points: 20, question: "Chất khí nào chiếm tỉ lệ thể tích lớn nhất trong không khí?", answer: "Khí Nitơ (N2, khoảng 78%)", media: "", note: "Hóa học", time: 15 },
          { id: 2, points: 20, question: "Ngọn núi cao nhất Nhật Bản tên là gì?", answer: "Núi Phú Sĩ (Fuji)", media: "", note: "Địa lý thế giới", time: 15 },
          { id: 3, points: 30, question: "Nhạc sĩ nào là tác giả của ca khúc bất hủ 'Hà Nội mùa vắng những cơn mưa'?", answer: "Trương Quý Hải (thơ Bùi Thanh Tuấn)", media: "", note: "Âm nhạc", time: 20 }
        ],
        2: [
          { id: 1, points: 20, question: "Loài chim nào là loài chim lớn nhất thế giới hiện nay và không biết bay?", answer: "Đà điểu", media: "", note: "Sinh học", time: 15 },
          { id: 2, points: 20, question: "Hành tinh nào lớn nhất trong Hệ Mặt Trời?", answer: "Sao Mộc (Jupiter)", media: "", note: "Thiên văn", time: 15 },
          { id: 3, points: 30, question: "Ai là nữ tướng duy nhất của Quân đội Nhân dân Việt Nam trong thời kỳ chống Mỹ?", answer: "Thiếu tướng Nguyễn Thị Định", media: "", note: "Lịch sử", time: 20 }
        ],
        3: [
          { id: 1, points: 20, question: "Đơn vị tiền tệ chung của Liên minh châu Âu (EU) tên là gì?", answer: "Euro (EUR)", media: "", note: "Kinh tế", time: 15 },
          { id: 2, points: 20, question: "Định luật bảo toàn năng lượng do nhà vật lý nào phát biểu?", answer: "Mayer / Joule / Helmholtz", media: "", note: "Vật lý", time: 15 },
          { id: 3, points: 30, question: "Quần đảo Trường Sa thuộc quyền quản lý hành chính của tỉnh nào ở Việt Nam?", answer: "Tỉnh Khánh Hòa", media: "", note: "Địa lý chủ quyền", time: 20 }
        ]
      }
    },
    subQuestions: [
      { id: 1, question: "Nguyên tố nào chiếm tỉ lệ lớn nhất trong vỏ Trái Đất?", answer: "Oxy (O)", time: 15 },
      { id: 2, question: "Ai là tác giả của tác phẩm 'Nam quốc sơn hà'?", answer: "Lý Thường Kiệt", time: 15 },
      { id: 3, question: "Hệ số ma sát trượt có đơn vị đo là gì?", answer: "Không có đơn vị (đại lượng không thứ nguyên)", time: 15 }
    ]
  };
}

module.exports = { parseExamExcel, getSampleExam };
