'use client';

import { ReactNode, useState } from 'react';
import { ResizableBox } from 'react-resizable';
import 'react-resizable/css/styles.css';

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

	return (
		<div className="h-screen flex flex-col bg-base-100">
			{/* Top Toolbar */}
			{toolbarContent && (
				<div className="h-16 border-b border-base-300 px-4">
					{toolbarContent}
				</div>
			)}

			{/* Main Workspace */}
			<div className="flex-1 flex overflow-hidden">
				{/* Left Sidebar */}
				{sidebarContent && (
					<ResizableBox
						width={isSidebarCollapsed ? 64 : 320}
						height={Infinity}
						axis="x"
						minConstraints={[64, Infinity]}
						maxConstraints={[480, Infinity]}
						className="border-r border-base-300"
					>
						<Panel
							title="Tools"
							isCollapsed={isSidebarCollapsed}
							onToggle={() => setSidebarCollapsed(!isSidebarCollapsed)}
						>
							{sidebarContent}
						</Panel>
					</ResizableBox>
				)}

				{/* Main Content Area */}
				<div className="flex-1 overflow-auto p-4">
					<Panel title="Workspace">
						{mainContent}
					</Panel>
				</div>

				{/* Right Panel */}
				{rightPanelContent && (
					<ResizableBox
						width={isRightPanelCollapsed ? 64 : 320}
						height={Infinity}
						axis="x"
						minConstraints={[64, Infinity]}
						maxConstraints={[480, Infinity]}
						className="border-l border-base-300"
					>
						<Panel
							title="Properties"
							isCollapsed={isRightPanelCollapsed}
							onToggle={() => setRightPanelCollapsed(!isRightPanelCollapsed)}
						>
							{rightPanelContent}
						</Panel>
					</ResizableBox>
				)}
			</div>
		</div>
	);
}