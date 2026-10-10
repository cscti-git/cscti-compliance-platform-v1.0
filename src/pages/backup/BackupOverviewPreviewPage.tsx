import React from 'react'
import { useNavigate } from 'react-router-dom'
import { BackupOverviewContent } from '@/components/backup/BackupOverviewContent'

export const BackupOverviewPreviewPage: React.FC = () => {
  const navigate = useNavigate()

  return (
    <BackupOverviewContent
      showPreviewBanner={true}
      onSelectTab={(tab, extraParams) => {
        const q = new URLSearchParams({ tab, ...(extraParams || {}) }).toString()
        navigate(`/backup?${q}`)
      }}
    />
  )
}

export default BackupOverviewPreviewPage
