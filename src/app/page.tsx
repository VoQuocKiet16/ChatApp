import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-indigo-900 flex flex-col">
      {/* Header */}
      <header className="p-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-gray-900 dark:text-white">ChatSphere</span>
          </div>
          <Link
            href="/login"
            className="px-6 py-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors duration-200 font-medium"
          >
            Login
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-3xl text-center space-y-8">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900 dark:text-white">
            Connect Instantly with ChatSphere
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Experience seamless communication with friends and teams using our modern chat platform.
          </p>

          {/* Chat Preview */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg max-w-md mx-auto">
            <div className="space-y-4 text-left">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-300 font-semibold">
                  A
                </div>
                <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
                  <p className="text-sm text-gray-700 dark:text-gray-300">Hey</p>
                </div>
              </div>
              <div className="flex items-start gap-3 justify-end">
                <div className="bg-indigo-600 p-3 rounded-lg">
                  <p className="text-sm text-white">Great! How about you?</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 font-semibold">
                  B
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 border-t border-gray-200 dark:border-indigo-800">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-center gap-6 text-sm text-gray-600 dark:text-indigo-400">
          <a
            href="https://chatsphere.com/features"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors"
          >
            Features
          </a>
          <a
            href="https://chatsphere.com/support"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors"
          >
            Support
          </a>
          <a
            href="https://chatsphere.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors"
          >
            ChatSphere
          </a>
        </div>
      </footer>
    </div>
  );
}