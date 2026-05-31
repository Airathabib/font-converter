import React from 'react';
import cls from './Tabs.module.scss';

export type TabId = 'fonts' | 'favicons';

export interface Tab {
	id: TabId;
	label: string;
	icon: string;
}

interface Props {
	tabs: Tab[];
	activeTab: TabId;
	onTabChange: (tab: TabId) => void;
}

export const Tabs: React.FC<Props> = ({ tabs, activeTab, onTabChange }) => {
	return (
		<div className={cls.tabs} role='tablist'>
			{tabs.map(tab => (
				<button
					key={tab.id}
					role='tab'
					aria-selected={activeTab === tab.id}
					className={`${cls.tab} ${activeTab === tab.id ? cls['tab--active'] : ''}`}
					onClick={() => onTabChange(tab.id)}
				>
					<span className={cls.tab__icon}>{tab.icon}</span>
					<span className={cls.tab__label}>{tab.label}</span>
				</button>
			))}
		</div>
	);
};
