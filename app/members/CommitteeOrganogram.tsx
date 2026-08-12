'use client';

import { useState, useEffect } from 'react';
import { User, Crown, Shield, Award } from 'lucide-react';
import { getPhotoSignedUrl } from '@/app/actions';

function MemberAvatar({ photoPath, name }: { photoPath?: string | null; name: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (photoPath) {
      getPhotoSignedUrl(photoPath).then((signedUrl) => {
        if (isMounted && signedUrl) setUrl(signedUrl);
      });
    }
    return () => { isMounted = false; };
  }, [photoPath]);

  return (
    <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-white shadow-xs bg-slate-100 flex items-center justify-center flex-shrink-0">
      {url ? (
        <img src={url} alt={name} className="w-full h-full object-cover" />
      ) : (
        <User size={20} className="text-slate-400" />
      )}
    </div>
  );
}

export default function CommitteeOrganogram({ nodes = [], isAdmin }: { nodes: any[]; isAdmin: boolean }) {
  const tier1 = nodes.filter((n) => Number(n.tier) === 1);
  const tier2 = nodes.filter((n) => Number(n.tier) === 2);
  const tier3 = nodes.filter((n) => Number(n.tier) === 3);

  return (
    <div className="space-y-8 text-center py-4">
      {/* Tier 1 */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-900 font-extrabold text-xs rounded-full border border-amber-300">
          <Crown size={14} className="text-amber-700" /> Top Leadership
        </div>

        <div className="flex flex-wrap justify-center gap-4">
          {tier1.map((node) => {
            const member = node.profiles;
            return (
              <div key={node.id} className="bg-gradient-to-b from-amber-50 to-white border-2 border-amber-300 p-4 rounded-2xl shadow-xs w-64 text-left flex items-center gap-3">
                <MemberAvatar photoPath={member?.photo_path} name={member?.full_name || node.title} />
                <div className="overflow-hidden">
                  <span className="px-2 py-0.5 bg-amber-200 text-amber-900 text-[10px] font-black rounded block w-fit mb-1">
                    {node.title}
                  </span>
                  <h4 className="font-bold text-slate-900 text-sm truncate">
                    {member?.full_name || <span className="italic text-slate-400">Vacant</span>}
                  </h4>
                  {isAdmin && <p className="text-[11px] font-mono text-slate-500">ID: {member?.account_id || 'N/A'}</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="w-0.5 h-6 bg-slate-300 mx-auto"></div>

      {/* Tier 2 */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-900 font-extrabold text-xs rounded-full border border-blue-300">
          <Shield size={14} className="text-blue-700" /> Executive Board Officers
        </div>

        <div className="flex flex-wrap justify-center gap-4">
          {tier2.map((node) => {
            const member = node.profiles;
            return (
              <div key={node.id} className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-xs w-60 text-left flex items-center gap-3">
                <MemberAvatar photoPath={member?.photo_path} name={member?.full_name || node.title} />
                <div className="overflow-hidden">
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-900 text-[10px] font-bold rounded block w-fit mb-1">
                    {node.title}
                  </span>
                  <h4 className="font-bold text-slate-900 text-xs truncate">
                    {member?.full_name || <span className="italic text-slate-400">Vacant</span>}
                  </h4>
                  {isAdmin && <p className="text-[10px] font-mono text-slate-500">ID: {member?.account_id || 'N/A'}</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="w-0.5 h-6 bg-slate-300 mx-auto"></div>

      {/* Tier 3 */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-100 text-purple-900 font-extrabold text-xs rounded-full border border-purple-300">
          <Award size={14} className="text-purple-700" /> Committee Members ({tier3.length})
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-4xl mx-auto">
          {tier3.map((node) => {
            const member = node.profiles;
            return (
              <div key={node.id} className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-left flex items-center gap-3">
                <MemberAvatar photoPath={member?.photo_path} name={member?.full_name || node.title} />
                <div className="overflow-hidden">
                  <h4 className="font-bold text-slate-900 text-xs truncate">
                    {member?.full_name || <span className="italic text-slate-400">Vacant Slot</span>}
                  </h4>
                  <p className="text-[10px] text-purple-800 font-semibold truncate">{node.title}</p>
                  {isAdmin && <p className="text-[10px] font-mono text-slate-400">ID: {member?.account_id || 'N/A'}</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}