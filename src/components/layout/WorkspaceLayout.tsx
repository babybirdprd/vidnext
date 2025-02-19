'use client';

import { ReactNode, useState, useEffect } from 'react';
import { ResizableBox } from 'react-resizable';
import 'react-resizable/css/styles.css';

const useMediaQuery = (query: string) => {
	const [matches, setMatches] = useState(false);

	useEffect(() => {
		const media = window.matchMedia(query);
		setMatches(media.matches);
		const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
		media.addEventListener('change', listener);
		return () => media.removeEventListener('change', listener);
	}, [query]);

	return matches;
};

interface PanelProps {
	title: string;
	children: ReactNode;
	isCollapsed?: boolean;
	onToggle?: () => void;
}

const Panel = ({ title, children, isCollapsed, onToggle }: PanelProps) => (
	<div className="card bg-base-200 shadow-lg h-full">
		<div className="card-body p-4">
			<div className="flex justify-between items-center mb-4">
				<h2 className="card-title text-lg">{title}</h2>
				{onToggle && (
					<button onClick={onToggle} className="btn btn-ghost btn-sm">
						{isCollapsed ? '▼' : '▲'}
					</button>
				)}
			</div>
			{!isCollapsed && children}
		</div>
	</div>
);

interface WorkspaceLayoutProps {
	toolbarContent?: ReactNode;
	sidebarContent?: ReactNode;
	mainContent: ReactNode;
	rightPanelContent?: ReactNode;
}

export function WorkspaceLayout({
	toolbarContent,
	sidebarContent,
	mainContent,
	rightPanelContent
}: WorkspaceLayoutProps) {
	const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
	const [isRightPanelCollapsed, setRightPanelCollapsed] = useState(false);
	const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
	const isMobile = useMediaQuery('(max-width: 768px)');

	// Add keyboard shortcuts
	useEffect(() => {
		const handleKeyPress = (e: KeyboardEvent) => {
			if (e.ctrlKey || e.metaKey) {
				switch(e.key) {
					case '[': setSidebarCollapsed(prev => !prev); break;
					case ']': setRightPanelCollapsed(prev => !prev); break;
				}
			}
		};
		window.addEventListener('keydown', handleKeyPress);
		return () => window.removeEventListener('keydown', handleKeyPress);
	}, []);

	return (
		<div className="h-screen flex flex-col bg-base-100">
			{/* Mobile Menu Button */}
			{isMobile && (
				<button 
					className="md:hidden fixed bottom-4 right-4 btn btn-circle btn-primary z-50"
					onClick={() => setMobileMenuOpen(!isMobileMenuOpen)}
				>
					<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
					</svg>
				</button>
			)}

			{/* Top Toolbar */}
			{toolbarContent && (
				<div className="h-16 border-b border-base-300 px-4 sticky top-0 bg-base-100 z-40">
					{toolbarContent}
				</div>
			)}

			{/* Main Workspace */}
			<div className="flex-1 flex overflow-hidden">
				{/* Left Sidebar */}
				{sidebarContent && (
					<div className={`
						${isMobile ? 'fixed inset-y-0 left-0 z-30 transform transition-transform duration-300 ease-in-out' : 'relative'}
						${isMobile && !isMobileMenuOpen ? '-translate-x-full' : 'translate-x-0'}
					`}>
						<ResizableBox
							width={isSidebarCollapsed ? 64 : 320}
							height={Infinity}
							axis={isMobile ? undefined : "x"}
							minConstraints={[64, Infinity]}
							maxConstraints={[480, Infinity]}
							className="border-r border-base-300 bg-base-100"
						>
							<Panel
								title="Tools"
								isCollapsed={isSidebarCollapsed}
								onToggle={() => setSidebarCollapsed(!isSidebarCollapsed)}
							>
								{sidebarContent}
							</Panel>
						</ResizableBox>
					</div>
				)}

				{/* Main Content Area */}
				<div className="flex-1 overflow-auto p-4">
					<Panel title="Workspace">
						{mainContent}
					</Panel>
				</div>

				{/* Right Panel */}
				{rightPanelContent && (
					<div className={`
						${isMobile ? 'fixed inset-y-0 right-0 z-30 transform transition-transform duration-300 ease-in-out' : 'relative'}
						${isMobile && !isMobileMenuOpen ? 'translate-x-full' : 'translate-x-0'}
					`}>
						<ResizableBox
							width={isRightPanelCollapsed ? 64 : 320}
							height={Infinity}
							axis={isMobile ? undefined : "x"}
							minConstraints={[64, Infinity]}
							maxConstraints={[480, Infinity]}
							className="border-l border-base-300 bg-base-100"
						>
							<Panel
								title="Properties"
								isCollapsed={isRightPanelCollapsed}
								onToggle={() => setRightPanelCollapsed(!isRightPanelCollapsed)}
							>
								{rightPanelContent}
							</Panel>
						</ResizableBox>
					</div>
				)}

				{/* Mobile Overlay */}
				{isMobile && isMobileMenuOpen && (
					<div 
						className="fixed inset-0 bg-black bg-opacity-50 z-20"
						onClick={() => setMobileMenuOpen(false)}
					/>
				)}
			</div>
		</div>
	);
}