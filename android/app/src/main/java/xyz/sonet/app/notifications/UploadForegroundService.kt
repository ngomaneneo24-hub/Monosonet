package xyz.sonet.app.notifications

import android.app.Notification
import android.app.Service
import android.content.Intent
import android.os.IBinder

class UploadForegroundService : Service() {
    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val notif: Notification = MessagingNotificationHelper.buildMessageNotification(
            context = this,
            conversationId = "upload",
            conversationTitle = "Uploading…",
            selfName = "You",
            messages = emptyList()
        )
        startForeground(1001, notif)
        // TODO: start real upload work and stopSelf() when done
        return START_NOT_STICKY
    }
}

