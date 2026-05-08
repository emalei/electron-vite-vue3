<script setup lang="ts">
import { ref } from 'vue'
import LearningShell from '@renderer/components/home/LearningShell.vue'
import LearningSidebar from '@renderer/components/home/LearningSidebar.vue'
import LearningTopBar from '@renderer/components/home/LearningTopBar.vue'
import MeetingScheduleSection from '@renderer/components/home/MeetingScheduleSection.vue'
import StudyCard from '@renderer/components/home/StudyCard.vue'
import type { HomeNavItem, MeetingRowData, ShortcutItem, StudyCardData } from '@renderer/types/home'

const openedMeetings = ref<string[]>([])
const creating = ref(false)

const shortcuts: ShortcutItem[] = [
  { label: '首页', icon: 'home', active: true },
  { label: '收藏', icon: 'heart' },
  { label: '学习', icon: 'library' }
]

const navItems: HomeNavItem[] = [
  { label: '首页', icon: 'home', active: true },
  { label: '我的课程', icon: 'heart' },
  { label: '历史会议', icon: 'history' },
  { label: '我的群聊', icon: 'team' }
]

const studyCards: StudyCardData[] = [
  {
    title: '建设书香企业读书公开直播',
    subtitle: '4.23 全民阅读活动',
    coverClass: 'cover-book',
    badges: ['直播预约', '直播预约', '直播预约']
  },
  {
    title: '建设书香企业读书公开直播',
    subtitle: '4.23 全民阅读活动',
    coverClass: 'cover-orange',
    badges: []
  },
  {
    title: '战略谈判力·第136期',
    subtitle: '12.12 20:00-12.25 21:00',
    coverClass: 'cover-blue',
    badges: ['会议预约', '会议进行中']
  },
  {
    title: '道德经夜话 第27期',
    subtitle: '21:00-22:00',
    coverClass: 'cover-sky',
    badges: []
  }
]

const todayMeetings: MeetingRowData[] = [
  {
    time: '06:30-7:30',
    status: '进行中',
    statusTone: 'live',
    badge: '置顶',
    title: '张官海创建的会议室',
    meetingCode: '419 610 056'
  },
  {
    time: '07:30-9:30',
    status: '待开始',
    statusTone: 'upcoming',
    title: '战略夜话“团队同频的干活”',
    meetingCode: '419 610 056',
    meta: '周期'
  },
  {
    time: '10:30-12:30',
    status: '待开始',
    statusTone: 'upcoming',
    badge: '公开',
    title: '「家庭幸福型企业」深度交流',
    meetingCode: '419 610 056',
    highlighted: true,
    joinable: true,
    showMore: true
  },
  {
    time: '14:30-21:30',
    date: '12.24',
    status: '待开始',
    statusTone: 'upcoming',
    title: '浙江、内蒙古地区成长例会浙江、内蒙古地区成长例会成长例会成长例会',
    meetingCode: '419 610 056'
  },
  {
    time: '17:30-19:30',
    status: '待开始',
    statusTone: 'upcoming',
    title: '浙江、内蒙古地区成长例会浙江、内蒙古地区成长例会成长例会成长例会',
    meetingCode: '419 610 056'
  },
  {
    time: '20:30-22:30',
    status: '待开始',
    statusTone: 'upcoming',
    title: '「家庭幸福型企业」深度交流',
    meetingCode: '419 610 056'
  }
]

const upcomingMeetings: MeetingRowData[] = [
  {
    time: '06:30-7:30',
    date: '8.2',
    status: '待开始',
    statusTone: 'upcoming',
    badge: '置顶',
    title: '张官海创建的会议室',
    meetingCode: '419 610 056'
  },
  {
    time: '07:30-9:30',
    date: '8.2-8.3',
    status: '待开始',
    statusTone: 'upcoming',
    title: '战略夜话“团队同频的干活”',
    meetingCode: '419 610 056',
    meta: '周期'
  },
  {
    time: '07:30-9:30',
    date: '8.3',
    status: '待开始',
    statusTone: 'upcoming',
    title: '战略夜话“团队同频的干活”',
    meetingCode: '419 610 056',
    meta: '周期'
  }
]

const createMeeting = async (): Promise<void> => {
  creating.value = true
  try {
    const response = await window.electronAPI.shell.createMeetingWindow()
    openedMeetings.value.unshift(response.meetingId)
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <LearningShell>
    <template #header>
      <LearningTopBar :shortcuts="shortcuts" :creating="creating" @quick-meeting="createMeeting" />
    </template>

    <template #sidebar>
      <LearningSidebar :items="navItems" />
    </template>

    <section class="study-section">
      <div class="section-title-row">
        <div>
          <h1>今日学习</h1>
          <p v-if="openedMeetings.length > 0">最近打开的会议工作区：{{ openedMeetings[0] }}</p>
        </div>
      </div>

      <div class="study-grid">
        <StudyCard v-for="card in studyCards" :key="`${card.title}-${card.coverClass}`" :card="card" />
      </div>
    </section>

    <MeetingScheduleSection title="今日会议（8月1日·周四）" :meetings="todayMeetings" @join="createMeeting" />
    <MeetingScheduleSection title="将来会议" :meetings="upcomingMeetings" />
  </LearningShell>
</template>

<style scoped>
.study-section {
  margin-bottom: 26px;
}

.section-title-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.section-title-row h1 {
  margin: 0;
  color: #272d3a;
  font-size: 2rem;
  line-height: 1.2;
}

.section-title-row p {
  margin: 8px 0 0;
  color: #9aa2b3;
  font-size: 0.9rem;
}

.study-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

@media (max-width: 1280px) {
  .study-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .section-title-row h1 {
    font-size: 1.6rem;
  }

  .study-grid {
    grid-template-columns: 1fr;
  }
}
</style>
